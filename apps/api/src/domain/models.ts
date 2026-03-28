export enum Role {
  HEAD = 'HEAD',
  MEMBER = 'MEMBER',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  monthlyBudget: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  familyId: string | null;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  familyId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  transactionAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface AuditLog {
  id: string;
  transactionId: string;
  userId: string;
  action: AuditAction;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AiReport {
  id: string;
  familyId: string;
  reportPeriod: string;
  summary: string;
  analysisJson: Record<string, unknown>;
  feedback: string;
  createdAt: Date;
}

export interface SessionContext {
  userId: string;
  familyId: string;
  displayName: string;
}

export interface SseEvent<T> {
  type:
    | 'transaction.created'
    | 'transaction.updated'
    | 'transaction.deleted'
    | 'report.generated';
  familyId: string;
  timestamp: string;
  payload: T;
}
