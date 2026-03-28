import type {
  AiReportAnalysis,
  DashboardBundle,
  PeriodMode,
  TransactionDTO,
} from "@/lib/types";

export type CategoryDatum = {
  category: string;
  amount: number;
  share: number;
  benchmarkDelta: number;
  fill: string;
};

export type KPI = {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "alert";
  hint: string;
};

export type TransactionItem = TransactionDTO & {
  tone: "income" | "expense";
};

const palette = [
  "#0f766e",
  "#f97316",
  "#f4b740",
  "#2563eb",
  "#dc2626",
  "#8b5cf6",
  "#06b6d4",
  "#64748b",
];

export type DashboardViewModel = {
  mode: PeriodMode;
  familyName: string;
  displayName: string;
  inviteCode: string;
  summary: string;
  feedback: string;
  kpis: KPI[];
  categories: CategoryDatum[];
  trend: AiReportAnalysis["trend"];
  fixedCosts: AiReportAnalysis["fixedCosts"];
  collaboration: AiReportAnalysis["collaboration"];
  forecast: AiReportAnalysis["forecast"];
  transactionItems: TransactionItem[];
  totalExpense: number;
  totalIncome: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

function toTone(value: number): KPI["tone"] {
  if (value < 0) {
    return "positive";
  }

  if (value > 10) {
    return "alert";
  }

  return "neutral";
}

export function createDashboardViewModel(
  bundle: DashboardBundle,
  mode: PeriodMode,
): DashboardViewModel {
  const analysis = bundle.report.analysisJson;
  const categories = analysis.categoryBreakdown.map((category, index) => ({
    ...category,
    fill: palette[index % palette.length],
  }));

  const kpis: KPI[] = [
    {
      label: mode === "month" ? "이번 달 총지출" : "이번 주 총지출",
      value: formatCurrency(analysis.kpis.totalExpense),
      tone: "neutral",
      hint: `비슷한 기간 대비 ${Math.abs(analysis.kpis.changeRate).toFixed(1)}% ${
        analysis.kpis.changeRate <= 0 ? "안정적" : "증가"
      }`,
    },
    {
      label: "예상 저축 여력",
      value: formatCurrency(analysis.kpis.savings),
      tone: "positive",
      hint: "목표 자금에 더 가까워지고 있어요",
    },
    {
      label: "고정비 집중도",
      value: `${Math.round(
        (analysis.fixedCosts.reduce((sum, cost) => sum + cost.amount, 0) /
          Math.max(analysis.kpis.totalExpense, 1)) *
          100,
      )}%`,
      tone: "neutral",
      hint: "고정비 구조를 한눈에 점검할 수 있어요",
    },
    {
      label: "전기 대비 변화",
      value: `${analysis.kpis.changeRate > 0 ? "+" : ""}${analysis.kpis.changeRate.toFixed(1)}%`,
      tone: toTone(analysis.kpis.changeRate),
      hint: "완만한 하향일수록 목표 달성이 쉬워져요",
    },
  ];

  return {
    mode,
    familyName: bundle.session.familyName,
    displayName: bundle.session.displayName,
    inviteCode: bundle.session.inviteCode,
    summary: bundle.report.summary,
    feedback: bundle.report.feedback,
    kpis,
    categories,
    trend: analysis.trend,
    fixedCosts: analysis.fixedCosts,
    collaboration: analysis.collaboration,
    forecast: analysis.forecast,
    transactionItems: bundle.transactions
      .filter((transaction) => !transaction.deletedAt)
      .sort(
        (left, right) =>
          new Date(right.transactionAt).getTime() - new Date(left.transactionAt).getTime(),
      )
      .map((transaction) => ({
        ...transaction,
        tone: transaction.type === "INCOME" ? "income" : "expense",
      })),
    totalExpense: analysis.kpis.totalExpense,
    totalIncome: analysis.kpis.totalIncome,
  };
}

