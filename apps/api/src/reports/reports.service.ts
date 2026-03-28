import { Prisma, getBenchmarksForHouseholdSize } from '@uri-ga/db';
import type {
  AiReport as PrismaAiReport,
  BenchmarkHouseholdSize,
  PrismaClient,
} from '@uri-ga/db';
import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionContext, SseEvent } from '../domain/models';
import { EventsService } from '../events/events.service';
import { PRISMA_CLIENT } from '../infrastructure/prisma.provider';
import { AiReportDto } from './dto/report.dto';

interface OllamaReportShape {
  summary: string;
  feedback: string;
  analysisJson: Record<string, unknown>;
}

function serializeReport(report: PrismaAiReport): AiReportDto {
  return {
    reportPeriod: report.reportPeriod,
    summary: report.summary,
    analysisJson: report.analysisJson as Record<string, unknown>,
    feedback: report.feedback,
    createdAt: report.createdAt.toISOString(),
  };
}

function resolveHouseholdSize(memberCount: number): BenchmarkHouseholdSize {
  if (memberCount <= 2) {
    return 2;
  }

  if (memberCount === 3) {
    return 3;
  }

  return 4;
}

function toPrismaJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function parsePeriod(period: string): { from: Date; to: Date } {
  if (/^\d{4}-\d{2}$/.test(period)) {
    const from = new Date(`${period}-01T00:00:00.000Z`);
    const to = new Date(
      Date.UTC(
        from.getUTCFullYear(),
        from.getUTCMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    );
    return { from, to };
  }

  if (/^\d{4}-W\d{2}$/.test(period)) {
    const [yearString, weekString] = period.split('-W');
    const year = Number(yearString);
    const week = Number(weekString);
    const januaryFourth = new Date(Date.UTC(year, 0, 4));
    const weekStart = new Date(januaryFourth);
    weekStart.setUTCDate(
      januaryFourth.getUTCDate() -
        ((januaryFourth.getUTCDay() + 6) % 7) +
        (week - 1) * 7,
    );
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);
    return { from: weekStart, to: weekEnd };
  }

  throw new BadRequestException('period must be YYYY-MM or YYYY-Www.');
}

function extractJson(rawText: string): OllamaReportShape {
  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch?.[1] ?? rawText;

  try {
    const parsed = JSON.parse(candidate) as OllamaReportShape;
    if (!parsed.summary || !parsed.feedback || !parsed.analysisJson) {
      throw new Error('Missing fields');
    }
    return parsed;
  } catch {
    throw new BadGatewayException('Ollama returned an invalid report payload.');
  }
}

@Injectable()
export class ReportsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly eventsService: EventsService,
  ) {}

  async generate(
    session: SessionContext,
    period: string,
  ): Promise<AiReportDto> {
    const { from, to } = parsePeriod(period);
    const [transactions, memberCount] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          familyId: session.familyId,
          deletedAt: null,
          transactionAt: {
            gte: from,
            lte: to,
          },
        },
      }),
      this.prisma.user.count({
        where: { familyId: session.familyId },
      }),
    ]);
    const benchmarks = getBenchmarksForHouseholdSize(
      resolveHouseholdSize(memberCount),
    );
    const benchmarkMap = Object.fromEntries(
      benchmarks.map((entry) => [entry.category, entry]),
    );

    const expenses = transactions.filter((entry) => entry.type === 'EXPENSE');
    const incomes = transactions.filter((entry) => entry.type === 'INCOME');

    const categoryTotals = expenses.reduce<Record<string, number>>(
      (accumulator, entry) => {
        accumulator[entry.category] =
          (accumulator[entry.category] ?? 0) + entry.amount;
        return accumulator;
      },
      {},
    );

    const analysisJson = {
      totals: {
        income: incomes.reduce((sum, entry) => sum + entry.amount, 0),
        expense: expenses.reduce((sum, entry) => sum + entry.amount, 0),
      },
      categoryTotals,
      benchmarkGaps: Object.entries(categoryTotals).map(([category, total]) => {
        const benchmark = benchmarkMap[category];
        return {
          category,
          total,
          benchmark: benchmark?.monthlyAverage ?? null,
          delta: benchmark ? total - benchmark.monthlyAverage : null,
          note: benchmark?.note ?? null,
        };
      }),
      benchmarkProfile: benchmarks,
      householdSize: resolveHouseholdSize(memberCount),
      transactionCount: transactions.length,
      period,
    };

    const report = await this.requestOllamaReport(
      period,
      analysisJson as Record<string, unknown>,
    );
    const stored = await this.prisma.aiReport.upsert({
      where: {
        familyId_reportPeriod: {
          familyId: session.familyId,
          reportPeriod: period,
        },
      },
      create: {
        familyId: session.familyId,
        reportPeriod: period,
        summary: report.summary,
        analysisJson: toPrismaJson(report.analysisJson),
        feedback: report.feedback,
      },
      update: {
        summary: report.summary,
        analysisJson: toPrismaJson(report.analysisJson),
        feedback: report.feedback,
      },
    });

    const dto = serializeReport(stored);
    this.emit(session.familyId, dto);
    return dto;
  }

  async get(session: SessionContext, period: string): Promise<AiReportDto> {
    const report = await this.prisma.aiReport.findUnique({
      where: {
        familyId_reportPeriod: {
          familyId: session.familyId,
          reportPeriod: period,
        },
      },
    });
    if (!report) {
      throw new NotFoundException('Report not found.');
    }
    return serializeReport(report);
  }

  private async requestOllamaReport(
    period: string,
    analysisJson: Record<string, unknown>,
  ): Promise<OllamaReportShape> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'qwen:8b';
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        prompt: [
          'You are Uri-Ga, a warm financial coach for a fully transparent family budget platform.',
          'Respond with valid JSON only.',
          'The JSON schema is {"summary": string, "feedback": string, "analysisJson": object}.',
          'Use positive framing, mention concrete spending patterns, and keep analysisJson compatible with the supplied metrics.',
          `Period: ${period}`,
          `Metrics: ${JSON.stringify(analysisJson)}`,
        ].join('\n'),
      }),
    });

    if (!response.ok) {
      throw new BadGatewayException(
        `Ollama request failed with ${response.status}.`,
      );
    }

    const payload = (await response.json()) as { response?: string };
    if (!payload.response) {
      throw new BadGatewayException(
        'Ollama response body is missing "response".',
      );
    }

    return extractJson(payload.response);
  }

  private emit(familyId: string, payload: AiReportDto): void {
    const event: SseEvent<AiReportDto> = {
      type: 'report.generated',
      familyId,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.eventsService.emit(event);
  }
}
