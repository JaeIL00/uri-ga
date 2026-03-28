export type PeriodMode = "week" | "month";

export type SessionBootstrapRequest = {
  mode: "create" | "join";
  familyName?: string;
  inviteCode?: string;
  displayName: string;
};

export type SessionDTO = {
  familyId: string;
  familyName: string;
  displayName: string;
  inviteCode: string;
};

export type TransactionType = "INCOME" | "EXPENSE";

export type TransactionDTO = {
  id: string;
  familyId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  transactionAt: string;
  deletedAt: string | null;
};

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export type AuditLogDTO = {
  id: string;
  transactionId: string;
  userId: string;
  action: AuditAction;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
};

export type ReportPeriod = `${number}-${number}` | `${number}-W${number}`;

export type AiReportAnalysis = {
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
    trend: "up" | "down" | "flat";
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
};

export type AiReportDTO = {
  reportPeriod: string;
  summary: string;
  analysisJson: AiReportAnalysis;
  feedback: string;
  createdAt: string;
};

export type FamilyEventType =
  | "transaction.created"
  | "transaction.updated"
  | "transaction.deleted"
  | "report.generated";

export type SseEvent<T> = {
  type: FamilyEventType;
  familyId: string;
  timestamp: string;
  payload: T;
};

export type DashboardBundle = {
  session: SessionDTO;
  report: AiReportDTO;
  transactions: TransactionDTO[];
};

