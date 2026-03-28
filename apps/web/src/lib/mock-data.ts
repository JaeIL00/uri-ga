import type {
  AiReportDTO,
  DashboardBundle,
  PeriodMode,
  SessionDTO,
  TransactionDTO,
} from "@/lib/types";

const now = new Date("2026-03-28T09:00:00+09:00");

const session: SessionDTO = {
  familyId: "family-uri-ga",
  familyName: "행복한 우리가",
  displayName: "재일",
  inviteCode: "URIGA-2026",
};

const transactions: TransactionDTO[] = [
  {
    id: "tx-001",
    familyId: session.familyId,
    userId: "user-a",
    type: "INCOME",
    amount: 4200000,
    category: "월급",
    description: "3월 급여",
    transactionAt: "2026-03-01T09:00:00+09:00",
    deletedAt: null,
  },
  {
    id: "tx-002",
    familyId: session.familyId,
    userId: "user-a",
    type: "EXPENSE",
    amount: 860000,
    category: "주거",
    description: "월세",
    transactionAt: "2026-03-02T09:00:00+09:00",
    deletedAt: null,
  },
  {
    id: "tx-003",
    familyId: session.familyId,
    userId: "user-b",
    type: "EXPENSE",
    amount: 540000,
    category: "식비",
    description: "마트 장보기",
    transactionAt: "2026-03-04T18:00:00+09:00",
    deletedAt: null,
  },
  {
    id: "tx-004",
    familyId: session.familyId,
    userId: "user-b",
    type: "EXPENSE",
    amount: 180000,
    category: "교통",
    description: "주유 및 대중교통",
    transactionAt: "2026-03-08T08:30:00+09:00",
    deletedAt: null,
  },
  {
    id: "tx-005",
    familyId: session.familyId,
    userId: "user-a",
    type: "EXPENSE",
    amount: 140000,
    category: "통신",
    description: "휴대폰 요금",
    transactionAt: "2026-03-10T11:00:00+09:00",
    deletedAt: null,
  },
  {
    id: "tx-006",
    familyId: session.familyId,
    userId: "user-b",
    type: "EXPENSE",
    amount: 96000,
    category: "구독",
    description: "OTT와 클라우드",
    transactionAt: "2026-03-13T21:00:00+09:00",
    deletedAt: null,
  },
  {
    id: "tx-007",
    familyId: session.familyId,
    userId: "user-a",
    type: "EXPENSE",
    amount: 210000,
    category: "교육",
    description: "아이 영어 수업",
    transactionAt: "2026-03-15T14:00:00+09:00",
    deletedAt: null,
  },
  {
    id: "tx-008",
    familyId: session.familyId,
    userId: "user-b",
    type: "EXPENSE",
    amount: 118000,
    category: "생활",
    description: "세제와 소모품",
    transactionAt: "2026-03-18T19:00:00+09:00",
    deletedAt: null,
  },
  {
    id: "tx-009",
    familyId: session.familyId,
    userId: "user-a",
    type: "EXPENSE",
    amount: 72000,
    category: "여가",
    description: "주말 영화",
    transactionAt: "2026-03-20T20:30:00+09:00",
    deletedAt: null,
  },
  {
    id: "tx-010",
    familyId: session.familyId,
    userId: "user-b",
    type: "EXPENSE",
    amount: 156000,
    category: "식비",
    description: "외식",
    transactionAt: "2026-03-24T19:30:00+09:00",
    deletedAt: null,
  },
];

const reportByMode: Record<PeriodMode, AiReportDTO> = {
  month: {
    reportPeriod: "2026-03",
    summary:
      "이번 달 우리 가족의 경제 온도는 매우 맑음이에요. 지난달보다 지출을 18만원 줄였고, 여행 자금까지 차근차근 가까워지고 있어요.",
    analysisJson: {
      kpis: {
        totalIncome: 4200000,
        totalExpense: 2372000,
        savings: 1828000,
        changeRate: -7.1,
      },
      categoryBreakdown: [
        { category: "주거", amount: 860000, share: 36.3, benchmarkDelta: 2.4 },
        { category: "식비", amount: 696000, share: 29.3, benchmarkDelta: -3.2 },
        { category: "교육", amount: 210000, share: 8.9, benchmarkDelta: 1.2 },
        { category: "교통", amount: 180000, share: 7.6, benchmarkDelta: 0.8 },
        { category: "통신", amount: 140000, share: 5.9, benchmarkDelta: 1.7 },
        { category: "생활", amount: 118000, share: 5, benchmarkDelta: -1.1 },
        { category: "구독", amount: 96000, share: 4, benchmarkDelta: 0.5 },
        { category: "여가", amount: 72000, share: 3, benchmarkDelta: -0.4 },
      ],
      trend: [
        { label: "1주", current: 640000, previous: 720000 },
        { label: "2주", current: 552000, previous: 610000 },
        { label: "3주", current: 618000, previous: 648000 },
        { label: "4주", current: 562000, previous: 574000 },
      ],
      fixedCosts: [
        { category: "주거", amount: 860000, trend: "flat" },
        { category: "통신", amount: 140000, trend: "down" },
        { category: "구독", amount: 96000, trend: "flat" },
      ],
      collaboration: {
        badgeTitle: "무지출 스트릭 5일",
        streakDays: 5,
        compliment:
          "두 분이 함께 장보기 타이밍을 맞춘 덕분에 계획 밖 소비가 조용히 줄었어요.",
      },
      forecast: {
        targetName: "가족 여행 자금",
        targetAmount: 3000000,
        projectedAmount: 3120000,
        message:
          "지금 흐름이면 다음 달 말에는 여행 자금을 무리 없이 채울 가능성이 높아요.",
      },
    },
    feedback:
      "식비는 이미 비슷한 규모의 가족 평균보다 안정적이에요. 이번 달엔 마트 방문 횟수만 한 번 더 다듬으면 저축 여유가 더 선명해질 거예요.",
    createdAt: now.toISOString(),
  },
  week: {
    reportPeriod: "2026-W13",
    summary:
      "이번 주는 균형 감각이 좋았어요. 생활 필수 지출은 지키면서도 여가비를 부드럽게 조절해 전체 흐름이 한층 정돈됐습니다.",
    analysisJson: {
      kpis: {
        totalIncome: 0,
        totalExpense: 346000,
        savings: 1854000,
        changeRate: -11.8,
      },
      categoryBreakdown: [
        { category: "식비", amount: 156000, share: 45.1, benchmarkDelta: -2.1 },
        { category: "생활", amount: 118000, share: 34.1, benchmarkDelta: 1.4 },
        { category: "여가", amount: 72000, share: 20.8, benchmarkDelta: -0.8 },
      ],
      trend: [
        { label: "월", current: 0, previous: 20000 },
        { label: "화", current: 118000, previous: 91000 },
        { label: "수", current: 0, previous: 35000 },
        { label: "목", current: 72000, previous: 84000 },
        { label: "금", current: 0, previous: 20000 },
        { label: "토", current: 156000, previous: 188000 },
        { label: "일", current: 0, previous: 42000 },
      ],
      fixedCosts: [
        { category: "구독", amount: 24000, trend: "flat" },
        { category: "통신", amount: 35000, trend: "flat" },
      ],
      collaboration: {
        badgeTitle: "계획소비 배지",
        streakDays: 3,
        compliment:
          "필요한 구매만 남기고 나머지는 다음 주로 미뤄서 예산 호흡이 안정적이었어요.",
      },
      forecast: {
        targetName: "봄나들이 준비비",
        targetAmount: 600000,
        projectedAmount: 648000,
        message:
          "이번 주 패턴을 유지하면 나들이 준비비를 더 여유 있게 확보할 수 있어요.",
      },
    },
    feedback:
      "생활비 지출은 꼭 필요한 흐름이었어요. 대신 주말 외식 횟수를 한 번만 줄여도 다음 주 예산의 탄력이 훨씬 좋아질 거예요.",
    createdAt: now.toISOString(),
  },
};

export function getMockDashboardBundle(mode: PeriodMode): DashboardBundle {
  return {
    session,
    report: reportByMode[mode],
    transactions: transactions.filter((transaction) => {
      if (mode === "month") {
        return true;
      }

      return new Date(transaction.transactionAt) >= new Date("2026-03-22T00:00:00+09:00");
    }),
  };
}

