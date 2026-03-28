/* eslint-disable @typescript-eslint/require-await */
import { AuditAction, Role, TransactionType } from '../src/domain/models';

type FamilyRecord = {
  id: string;
  name: string;
  inviteCode: string;
  monthlyBudget: number;
  createdAt: Date;
  updatedAt: Date;
};

type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: Role;
  familyId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type TransactionRecord = {
  id: string;
  familyId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  transactionAt: Date;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AuditLogRecord = {
  id: string;
  transactionId: string;
  userId: string;
  action: AuditAction;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: Date;
};

type AiReportRecord = {
  id: string;
  familyId: string;
  reportPeriod: string;
  summary: string;
  analysisJson: Record<string, unknown>;
  feedback: string;
  createdAt: Date;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createFakePrisma() {
  let sequence = 1;

  const families: FamilyRecord[] = [];
  const users: UserRecord[] = [];
  const transactions: TransactionRecord[] = [];
  const auditLogs: AuditLogRecord[] = [];
  const reports: AiReportRecord[] = [];

  const nextId = (prefix: string) => `${prefix}-${sequence++}`;

  return {
    family: {
      create: async ({
        data,
      }: {
        data: { name: string; inviteCode: string; monthlyBudget?: number };
      }) => {
        const now = new Date();
        const family: FamilyRecord = {
          id: nextId('family'),
          name: data.name,
          inviteCode: data.inviteCode,
          monthlyBudget: data.monthlyBudget ?? 0,
          createdAt: now,
          updatedAt: now,
        };
        families.push(family);
        return clone(family);
      },
      findUnique: async ({
        where,
      }: {
        where: { id?: string; inviteCode?: string };
      }) => {
        const family =
          where.id !== undefined
            ? families.find((entry) => entry.id === where.id)
            : families.find((entry) => entry.inviteCode === where.inviteCode);
        return family ? clone(family) : null;
      },
    },
    user: {
      create: async ({
        data,
      }: {
        data: {
          email: string;
          name: string;
          role: Role;
          familyId: string | null;
        };
      }) => {
        const now = new Date();
        const user: UserRecord = {
          id: nextId('user'),
          email: data.email,
          name: data.name,
          role: data.role,
          familyId: data.familyId,
          createdAt: now,
          updatedAt: now,
        };
        users.push(user);
        return clone(user);
      },
      findUnique: async ({
        where,
        include,
      }: {
        where: { id: string };
        include?: { family?: boolean };
      }) => {
        const user = users.find((entry) => entry.id === where.id);
        if (!user) {
          return null;
        }

        if (!include?.family) {
          return clone(user);
        }

        const family =
          families.find((entry) => entry.id === user.familyId) ?? null;
        return {
          ...clone(user),
          family: family ? clone(family) : null,
        };
      },
      count: async ({ where }: { where: { familyId: string } }) =>
        users.filter((entry) => entry.familyId === where.familyId).length,
    },
    transaction: {
      findMany: async ({
        where,
      }: {
        where: {
          familyId: string;
          deletedAt?: null;
          transactionAt?: { gte?: Date; lte?: Date };
          type?: TransactionType;
          category?: string;
        };
      }) =>
        transactions
          .filter((entry) => entry.familyId === where.familyId)
          .filter((entry) =>
            where.deletedAt === null ? entry.deletedAt === null : true,
          )
          .filter((entry) => (where.type ? entry.type === where.type : true))
          .filter((entry) =>
            where.category ? entry.category === where.category : true,
          )
          .filter((entry) =>
            where.transactionAt?.gte
              ? entry.transactionAt >= where.transactionAt.gte
              : true,
          )
          .filter((entry) =>
            where.transactionAt?.lte
              ? entry.transactionAt <= where.transactionAt.lte
              : true,
          )
          .sort(
            (left, right) =>
              right.transactionAt.getTime() - left.transactionAt.getTime(),
          )
          .map((entry) => clone(entry)),
      create: async ({
        data,
      }: {
        data: {
          familyId: string;
          userId: string;
          type: TransactionType;
          amount: number;
          category: string;
          description: string | null;
          transactionAt: Date;
        };
      }) => {
        const now = new Date();
        const transaction: TransactionRecord = {
          id: nextId('txn'),
          familyId: data.familyId,
          userId: data.userId,
          type: data.type,
          amount: data.amount,
          category: data.category,
          description: data.description,
          transactionAt: data.transactionAt,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        transactions.push(transaction);
        return clone(transaction);
      },
      findFirst: async ({
        where,
      }: {
        where: { id: string; familyId: string };
      }) => {
        const transaction = transactions.find(
          (entry) => entry.id === where.id && entry.familyId === where.familyId,
        );
        return transaction ? clone(transaction) : null;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<TransactionRecord>;
      }) => {
        const index = transactions.findIndex((entry) => entry.id === where.id);
        if (index < 0) {
          throw new Error('Transaction not found');
        }
        const updated: TransactionRecord = {
          ...transactions[index],
          ...data,
          updatedAt: new Date(),
        };
        transactions[index] = updated;
        return clone(updated);
      },
    },
    auditLog: {
      create: async ({
        data,
      }: {
        data: {
          transactionId: string;
          userId: string;
          action: AuditAction;
          oldData: Record<string, unknown> | null;
          newData: Record<string, unknown> | null;
        };
      }) => {
        const auditLog: AuditLogRecord = {
          id: nextId('audit'),
          transactionId: data.transactionId,
          userId: data.userId,
          action: data.action,
          oldData: data.oldData,
          newData: data.newData,
          createdAt: new Date(),
        };
        auditLogs.push(auditLog);
        return clone(auditLog);
      },
      findMany: async ({
        where,
      }: {
        where: { transactionId: string };
        orderBy: { createdAt: 'asc' };
      }) =>
        auditLogs
          .filter((entry) => entry.transactionId === where.transactionId)
          .sort(
            (left, right) =>
              left.createdAt.getTime() - right.createdAt.getTime(),
          )
          .map((entry) => clone(entry)),
    },
    aiReport: {
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: {
          familyId_reportPeriod: { familyId: string; reportPeriod: string };
        };
        create: Omit<AiReportRecord, 'id' | 'createdAt'>;
        update: Partial<
          Omit<AiReportRecord, 'id' | 'familyId' | 'reportPeriod' | 'createdAt'>
        >;
      }) => {
        const existingIndex = reports.findIndex(
          (entry) =>
            entry.familyId === where.familyId_reportPeriod.familyId &&
            entry.reportPeriod === where.familyId_reportPeriod.reportPeriod,
        );

        if (existingIndex >= 0) {
          const next: AiReportRecord = {
            ...reports[existingIndex],
            ...update,
            createdAt: new Date(),
          };
          reports[existingIndex] = next;
          return clone(next);
        }

        const report: AiReportRecord = {
          id: nextId('report'),
          createdAt: new Date(),
          ...create,
        };
        reports.push(report);
        return clone(report);
      },
      findUnique: async ({
        where,
      }: {
        where: {
          familyId_reportPeriod: { familyId: string; reportPeriod: string };
        };
      }) => {
        const report = reports.find(
          (entry) =>
            entry.familyId === where.familyId_reportPeriod.familyId &&
            entry.reportPeriod === where.familyId_reportPeriod.reportPeriod,
        );
        return report ? clone(report) : null;
      },
    },
  };
}
