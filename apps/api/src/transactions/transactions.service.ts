import {
  AuditAction as PrismaAuditAction,
  Prisma,
  decryptMemoIfPresent,
  encryptMemoIfPresent,
} from '@uri-ga/db';
import type {
  AuditLog as PrismaAuditLog,
  PrismaClient,
  Transaction as PrismaTransaction,
} from '@uri-ga/db';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, SessionContext, TransactionType } from '../domain/models';
import { EventsService } from '../events/events.service';
import { PRISMA_CLIENT } from '../infrastructure/prisma.provider';
import {
  AuditLogDto,
  CreateTransactionRequest,
  QueryTransactionsRequest,
  TransactionDto,
  UpdateTransactionRequest,
} from './dto/transaction.dto';

function serializeTransaction(transaction: PrismaTransaction): TransactionDto {
  return {
    id: transaction.id,
    familyId: transaction.familyId,
    userId: transaction.userId,
    type: transaction.type as unknown as TransactionType,
    amount: transaction.amount,
    category: transaction.category,
    description: decryptMemoIfPresent(transaction.description),
    transactionAt: transaction.transactionAt.toISOString(),
    deletedAt: transaction.deletedAt?.toISOString() ?? null,
  };
}

function toPrismaJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toNullablePrismaJson(
  value: Record<string, unknown> | null,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : toPrismaJson(value);
}

function snapshotTransaction(
  transaction: PrismaTransaction,
): Record<string, unknown> {
  return {
    id: transaction.id,
    familyId: transaction.familyId,
    userId: transaction.userId,
    type: transaction.type,
    amount: transaction.amount,
    category: transaction.category,
    description: decryptMemoIfPresent(transaction.description),
    transactionAt: transaction.transactionAt.toISOString(),
    deletedAt: transaction.deletedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly eventsService: EventsService,
  ) {}

  async list(
    session: SessionContext,
    query: QueryTransactionsRequest,
  ): Promise<TransactionDto[]> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    if (from && Number.isNaN(from.getTime())) {
      throw new BadRequestException('Invalid from date.');
    }

    if (to && Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid to date.');
    }

    if (query.type && !Object.values(TransactionType).includes(query.type)) {
      throw new BadRequestException('Invalid transaction type.');
    }

    return (
      await this.prisma.transaction.findMany({
        where: {
          familyId: session.familyId,
          deletedAt: null,
          ...(from || to
            ? {
                transactionAt: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {}),
          ...(query.type ? { type: query.type } : {}),
          ...(query.category ? { category: query.category } : {}),
        },
        orderBy: { transactionAt: 'desc' },
      })
    ).map(serializeTransaction);
  }

  async create(
    session: SessionContext,
    input: CreateTransactionRequest,
  ): Promise<TransactionDto> {
    if (!Object.values(TransactionType).includes(input.type)) {
      throw new BadRequestException('type must be INCOME or EXPENSE.');
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new BadRequestException('amount must be greater than zero.');
    }
    if (!input.category?.trim()) {
      throw new BadRequestException('category is required.');
    }

    const transactionAt = input.transactionAt
      ? new Date(input.transactionAt)
      : new Date();
    if (Number.isNaN(transactionAt.getTime())) {
      throw new BadRequestException('Invalid transactionAt.');
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        familyId: session.familyId,
        userId: session.userId,
        type: input.type,
        amount: input.amount,
        category: input.category.trim(),
        description: encryptMemoIfPresent(input.description?.trim()),
        transactionAt,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        transactionId: transaction.id,
        userId: session.userId,
        action: PrismaAuditAction.CREATE,
        oldData: Prisma.JsonNull,
        newData: toNullablePrismaJson(snapshotTransaction(transaction)),
      },
    });

    const dto = serializeTransaction(transaction);
    this.emit(session.familyId, 'transaction.created', dto);
    return dto;
  }

  async update(
    session: SessionContext,
    transactionId: string,
    input: UpdateTransactionRequest,
  ): Promise<TransactionDto> {
    const transaction = await this.requireFamilyTransaction(
      session,
      transactionId,
    );
    const patch: Partial<PrismaTransaction> = {};

    if (input.type !== undefined) {
      if (!Object.values(TransactionType).includes(input.type)) {
        throw new BadRequestException('Invalid transaction type.');
      }
      patch.type = input.type;
    }

    if (input.amount !== undefined) {
      if (!Number.isFinite(input.amount) || input.amount <= 0) {
        throw new BadRequestException('amount must be greater than zero.');
      }
      patch.amount = input.amount;
    }

    if (input.category !== undefined) {
      if (!input.category.trim()) {
        throw new BadRequestException('category cannot be empty.');
      }
      patch.category = input.category.trim();
    }

    if (input.description !== undefined) {
      patch.description = encryptMemoIfPresent(input.description?.trim());
    }

    if (input.transactionAt !== undefined) {
      const transactionAt = new Date(input.transactionAt);
      if (Number.isNaN(transactionAt.getTime())) {
        throw new BadRequestException('Invalid transactionAt.');
      }
      patch.transactionAt = transactionAt;
    }

    const updated = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: patch,
    });
    await this.prisma.auditLog.create({
      data: {
        transactionId: transaction.id,
        userId: session.userId,
        action: PrismaAuditAction.UPDATE,
        oldData: toNullablePrismaJson(snapshotTransaction(transaction)),
        newData: toNullablePrismaJson(snapshotTransaction(updated)),
      },
    });

    const dto = serializeTransaction(updated);
    this.emit(session.familyId, 'transaction.updated', dto);
    return dto;
  }

  async remove(
    session: SessionContext,
    transactionId: string,
  ): Promise<TransactionDto> {
    const transaction = await this.requireFamilyTransaction(
      session,
      transactionId,
    );
    if (transaction.deletedAt) {
      return serializeTransaction(transaction);
    }

    const deleted = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { deletedAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        transactionId: transaction.id,
        userId: session.userId,
        action: PrismaAuditAction.DELETE,
        oldData: toNullablePrismaJson(snapshotTransaction(transaction)),
        newData: toNullablePrismaJson(snapshotTransaction(deleted)),
      },
    });

    const dto = serializeTransaction(deleted);
    this.emit(session.familyId, 'transaction.deleted', dto);
    return dto;
  }

  async getAuditLogs(
    session: SessionContext,
    transactionId: string,
  ): Promise<AuditLogDto[]> {
    await this.requireFamilyTransaction(session, transactionId);

    return (
      await this.prisma.auditLog.findMany({
        where: { transactionId },
        orderBy: { createdAt: 'asc' },
      })
    ).map((entry: PrismaAuditLog) => ({
      id: entry.id,
      transactionId: entry.transactionId,
      userId: entry.userId,
      action: entry.action as AuditAction,
      oldData: (entry.oldData as Record<string, unknown> | null) ?? null,
      newData: (entry.newData as Record<string, unknown> | null) ?? null,
      createdAt: entry.createdAt.toISOString(),
    }));
  }

  private async requireFamilyTransaction(
    session: SessionContext,
    transactionId: string,
  ): Promise<PrismaTransaction> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        familyId: session.familyId,
      },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found.');
    }
    return transaction;
  }

  private emit(
    familyId: string,
    type: 'transaction.created' | 'transaction.updated' | 'transaction.deleted',
    payload: TransactionDto,
  ): void {
    this.eventsService.emit({
      type,
      familyId,
      timestamp: new Date().toISOString(),
      payload,
    });
  }
}
