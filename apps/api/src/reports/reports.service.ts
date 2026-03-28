import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, getBenchmarksForHouseholdSize } from '@uri-ga/db';
import type {
  AiReport as PrismaAiReport,
  BenchmarkEntry,
  BenchmarkHouseholdSize,
  PrismaClient,
  Transaction as PrismaTransaction,
} from '@uri-ga/db';
import { SessionContext, SseEvent } from '../domain/models';
import { EventsService } from '../events/events.service';
import { PRISMA_CLIENT } from '../infrastructure/prisma.provider';
import { AiReportDto } from './dto/report.dto';

interface OllamaReportShape {
  summary: string;
  feedback: string;
}

interface AnalysisJson {
  kpis: {
    totalIncome: number;
    totalExpense: number;
    savings: number;
    changeRate: number;
  };
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    share: number;
    benchmarkDelta: number;
  }>;
  trend: Array<{
    label: string;
    current: number;
    previous: number;
  }>;
  fixedCosts: Array<{
    category: string;
    amount: number;
    trend: 'up' | 'down' | 'flat';
  }>;
  collaboration: {
    badgeTitle: string;
    streakDays: number;
    compliment: string;
  };
  forecast: {
    targetName: string;
    targetAmount: number;
    projectedAmount: number;
    message: string;
  };
}

interface PeriodRange {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  mode: 'month' | 'week';
}

interface TrendBucket {
  label: string;
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
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

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function parsePeriod(period: string): PeriodRange {
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
    const durationMs = to.getTime() - from.getTime() + 1;

    return {
      from,
      to,
      previousFrom: new Date(from.getTime() - durationMs),
      previousTo: new Date(to.getTime() - durationMs),
      mode: 'month',
    };
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

    const durationMs = weekEnd.getTime() - weekStart.getTime() + 1;

    return {
      from: weekStart,
      to: weekEnd,
      previousFrom: new Date(weekStart.getTime() - durationMs),
      previousTo: new Date(weekEnd.getTime() - durationMs),
      mode: 'week',
    };
  }

  throw new BadRequestException('period must be YYYY-MM or YYYY-Www.');
}

function extractJson(rawText: string): OllamaReportShape {
  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch?.[1] ?? rawText;

  try {
    const parsed = JSON.parse(candidate) as OllamaReportShape;
    if (!parsed.summary?.trim() || !parsed.feedback?.trim()) {
      throw new Error('Missing fields');
    }

    return {
      summary: parsed.summary.trim(),
      feedback: parsed.feedback.trim(),
    };
  } catch {
    throw new BadGatewayException('Ollama returned an invalid report payload.');
  }
}

function sumAmounts(
  transactions: PrismaTransaction[],
  type: 'INCOME' | 'EXPENSE',
): number {
  return transactions
    .filter((entry) => entry.type === type)
    .reduce((sum, entry) => sum + entry.amount, 0);
}

function buildCategoryBreakdown(
  transactions: PrismaTransaction[],
  benchmarks: BenchmarkEntry[],
): AnalysisJson['categoryBreakdown'] {
  const expenses = transactions.filter((entry) => entry.type === 'EXPENSE');
  const totalExpense = Math.max(sumAmounts(transactions, 'EXPENSE'), 1);
  const totals = expenses.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.category] = (acc[entry.category] ?? 0) + entry.amount;
    return acc;
  }, {});
  const benchmarkMap = Object.fromEntries(
    benchmarks.map((entry) => [entry.category, entry.monthlyAverage]),
  );

  return Object.entries(totals)
    .map(([category, amount]) => {
      const benchmark = benchmarkMap[category] ?? amount;
      const benchmarkDelta =
        benchmark > 0 ? ((amount - benchmark) / benchmark) * 100 : 0;

      return {
        category,
        amount,
        share: (amount / totalExpense) * 100,
        benchmarkDelta,
      };
    })
    .sort((left, right) => right.amount - left.amount);
}

function enumerateDays(from: Date, to: Date): Date[] {
  const cursor = new Date(from);
  const days: Date[] = [];

  while (cursor.getTime() <= to.getTime()) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

function buildTrendBuckets(range: PeriodRange): TrendBucket[] {
  if (range.mode === 'week') {
    return enumerateDays(range.from, range.to).map((day) => {
      const currentStart = new Date(day);
      currentStart.setUTCHours(0, 0, 0, 0);

      const currentEnd = new Date(day);
      currentEnd.setUTCHours(23, 59, 59, 999);

      const previousStart = new Date(currentStart);
      previousStart.setUTCDate(previousStart.getUTCDate() - 7);

      const previousEnd = new Date(currentEnd);
      previousEnd.setUTCDate(previousEnd.getUTCDate() - 7);

      return {
        label: `${day.getUTCMonth() + 1}/${day.getUTCDate()}`,
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
      };
    });
  }

  const buckets: TrendBucket[] = [];
  let cursor = new Date(range.from);
  const periodDuration = range.to.getTime() - range.from.getTime() + 1;

  while (cursor.getTime() <= range.to.getTime()) {
    const currentStart = new Date(cursor);
    currentStart.setUTCHours(0, 0, 0, 0);

    const currentEnd = new Date(currentStart);
    currentEnd.setUTCDate(currentEnd.getUTCDate() + 6);
    if (currentEnd.getTime() > range.to.getTime()) {
      currentEnd.setTime(range.to.getTime());
    }
    currentEnd.setUTCHours(23, 59, 59, 999);

    buckets.push({
      label: `${currentStart.getUTCMonth() + 1}/${currentStart.getUTCDate()}`,
      currentStart,
      currentEnd,
      previousStart: new Date(currentStart.getTime() - periodDuration),
      previousEnd: new Date(currentEnd.getTime() - periodDuration),
    });

    cursor = new Date(currentEnd);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    cursor.setUTCHours(0, 0, 0, 0);
  }

  return buckets;
}

function sumExpensesInWindow(
  transactions: PrismaTransaction[],
  from: Date,
  to: Date,
): number {
  return transactions
    .filter((entry) => entry.type === 'EXPENSE')
    .filter((entry) => entry.transactionAt >= from && entry.transactionAt <= to)
    .reduce((sum, entry) => sum + entry.amount, 0);
}

function calculateNoSpendStreak(
  transactions: PrismaTransaction[],
  range: PeriodRange,
): number {
  const expenseDays = new Set(
    transactions
      .filter((entry) => entry.type === 'EXPENSE')
      .map((entry) => entry.transactionAt.toISOString().slice(0, 10)),
  );
  let streak = 0;

  for (const day of enumerateDays(range.from, range.to)) {
    const key = day.toISOString().slice(0, 10);
    if (!expenseDays.has(key)) {
      streak += 1;
    }
  }

  return streak;
}

function buildFixedCosts(
  currentTransactions: PrismaTransaction[],
  previousTransactions: PrismaTransaction[],
): AnalysisJson['fixedCosts'] {
  const categories = ['주거', '통신', '보험', '교육'];

  return categories.map((category) => {
    const amount = currentTransactions
      .filter(
        (entry) => entry.type === 'EXPENSE' && entry.category === category,
      )
      .reduce((sum, entry) => sum + entry.amount, 0);

    const previous = previousTransactions
      .filter(
        (entry) => entry.type === 'EXPENSE' && entry.category === category,
      )
      .reduce((sum, entry) => sum + entry.amount, 0);

    const delta = amount - previous;

    return {
      category,
      amount,
      trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    };
  });
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
    const range = parsePeriod(period);

    const [currentTransactions, previousTransactions, memberCount] =
      await Promise.all([
        this.prisma.transaction.findMany({
          where: {
            familyId: session.familyId,
            deletedAt: null,
            transactionAt: {
              gte: range.from,
              lte: range.to,
            },
          },
        }),
        this.prisma.transaction.findMany({
          where: {
            familyId: session.familyId,
            deletedAt: null,
            transactionAt: {
              gte: range.previousFrom,
              lte: range.previousTo,
            },
          },
        }),
        this.prisma.user.count({
          where: { familyId: session.familyId },
        }),
      ]);

    const householdSize = resolveHouseholdSize(memberCount);
    const benchmarks = getBenchmarksForHouseholdSize(householdSize);

    const currentIncome = sumAmounts(currentTransactions, 'INCOME');
    const currentExpense = sumAmounts(currentTransactions, 'EXPENSE');
    const previousExpense = sumAmounts(previousTransactions, 'EXPENSE');
    const changeRate =
      previousExpense > 0
        ? ((currentExpense - previousExpense) / previousExpense) * 100
        : 0;

    const trend = buildTrendBuckets(range).map((bucket) => ({
      label: bucket.label,
      current: sumExpensesInWindow(
        currentTransactions,
        bucket.currentStart,
        bucket.currentEnd,
      ),
      previous: sumExpensesInWindow(
        previousTransactions,
        bucket.previousStart,
        bucket.previousEnd,
      ),
    }));

    const noSpendStreak = calculateNoSpendStreak(currentTransactions, range);
    const projectedAmount = Math.max(
      0,
      Math.round((currentIncome - currentExpense) * 1.2),
    );
    const forecastTarget = 1500000;

    const analysisJson: AnalysisJson = {
      kpis: {
        totalIncome: currentIncome,
        totalExpense: currentExpense,
        savings: currentIncome - currentExpense,
        changeRate,
      },
      categoryBreakdown: buildCategoryBreakdown(
        currentTransactions,
        benchmarks,
      ),
      trend,
      fixedCosts: buildFixedCosts(currentTransactions, previousTransactions),
      collaboration: {
        badgeTitle:
          noSpendStreak >= 5
            ? '함께 만든 무지출 리듬'
            : '함께 지키는 예산 페이스',
        streakDays: noSpendStreak,
        compliment:
          noSpendStreak >= 5
            ? `이번 기간 ${noSpendStreak}일의 무지출 협력이 예산 안정성에 크게 기여했어요.`
            : '필요 지출을 존중하면서도 함께 속도를 맞추는 흐름이 좋아요.',
      },
      forecast: {
        targetName: '가족 여행 자금',
        targetAmount: forecastTarget,
        projectedAmount,
        message:
          projectedAmount >= forecastTarget
            ? '현재 페이스를 유지하면 다음 기간 목표 달성 가능성이 높아요.'
            : '지금 흐름에서 식비/고정비를 조금만 다듬으면 목표에 더 가까워질 수 있어요.',
      },
    };

    const report = await this.requestOllamaReport(period, analysisJson);
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
        analysisJson: toPrismaJson(analysisJson),
        feedback: report.feedback,
      },
      update: {
        summary: report.summary,
        analysisJson: toPrismaJson(analysisJson),
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
    analysisJson: AnalysisJson,
  ): Promise<OllamaReportShape> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'qwen:8b';
    const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS ?? '30000');

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          stream: false,
          prompt: [
            '너는 Uri-Ga의 다정한 금융 코치야.',
            '반드시 JSON만 반환해.',
            '스키마: {"summary": string, "feedback": string}',
            'summary는 현재 기간의 경제 온도 요약 1~2문장.',
            'feedback은 긍정 프레이밍 + 실천 가능한 넛지 2~3문장.',
            `period=${period}`,
            `metrics=${JSON.stringify(analysisJson)}`,
          ].join('\n'),
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadGatewayException('Ollama request timed out.');
      }
      throw new BadGatewayException('Ollama request failed.');
    } finally {
      clearTimeout(timeoutHandle);
    }

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
