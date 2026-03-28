import { AuditAction, TransactionType } from '../../domain/models';

export interface TransactionDto {
  id: string;
  familyId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  transactionAt: string;
  deletedAt: string | null;
}

export interface AuditLogDto {
  id: string;
  transactionId: string;
  userId: string;
  action: AuditAction;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateTransactionRequest {
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  transactionAt?: string;
}

export interface UpdateTransactionRequest {
  type?: TransactionType;
  amount?: number;
  category?: string;
  description?: string | null;
  transactionAt?: string;
}

export interface QueryTransactionsRequest {
  from?: string;
  to?: string;
  type?: TransactionType;
  category?: string;
}
