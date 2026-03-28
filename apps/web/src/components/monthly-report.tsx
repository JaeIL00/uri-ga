import type { DashboardViewModel } from "@/lib/dashboard";

type MonthlyReportProps = {
  viewModel: DashboardViewModel;
};

export function MonthlyReport({ viewModel }: MonthlyReportProps) {
  const strongestCategory = viewModel.categories[0];
  const periodLabel = viewModel.mode === "month" ? "이달" : "이번 주";

  return (
    <section className="grid gap-5 lg:grid-cols-4" aria-label="월간 리포트">
      <article className="report-card lg:col-span-2 lg:translate-y-2">
        <p className="report-index">0. {periodLabel} 요약</p>
        <h2 className="report-title">{viewModel.summary}</h2>
        <p className="report-copy">
          지금의 속도라면 {viewModel.familyName}의 예산 체력은 충분히 안정적입니다. 큰 긴장 없이,
          필요한 곳에만 에너지를 쓰면 돼요.
        </p>
      </article>

      <article className="report-card lg:translate-y-8">
        <p className="report-index">1. 주요 소비 흐름</p>
        <h3 className="report-title">
          {strongestCategory?.category ?? "식비"}가 가장 또렷하게 보였어요
        </h3>
        <p className="report-copy">
          전체 지출의 {Math.round(strongestCategory?.share ?? 0)}%를 차지합니다. 한 번의 장보기 리듬만
          다듬어도 다음 주 숨통이 더 넓어질 수 있어요.
        </p>
      </article>

      <article className="report-card">
        <p className="report-index">2. 가족 협력 리포트</p>
        <h3 className="report-title">{viewModel.collaboration.badgeTitle}</h3>
        <p className="report-badge">
          함께 만든 연속 기록 {viewModel.collaboration.streakDays}일
        </p>
        <p className="report-copy">{viewModel.collaboration.compliment}</p>
      </article>

      <article className="report-card lg:col-span-2 lg:-translate-y-1">
        <p className="report-index">3. 다정한 예측 가이드</p>
        <h3 className="report-title">{viewModel.forecast.targetName} 준비 흐름</h3>
        <p className="report-copy">{viewModel.forecast.message}</p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-[color:var(--surface-container)] p-3">
            <div className="text-[color:var(--on-surface-soft)]">목표 금액</div>
            <div className="mt-1 font-semibold text-[color:var(--on-surface)]">
              {new Intl.NumberFormat("ko-KR", {
                style: "currency",
                currency: "KRW",
                maximumFractionDigits: 0,
              }).format(viewModel.forecast.targetAmount)}
            </div>
          </div>
          <div className="rounded-2xl bg-[color:var(--surface-container)] p-3">
            <div className="text-[color:var(--on-surface-soft)]">현재 예측</div>
            <div className="mt-1 font-semibold text-[color:var(--primary)]">
              {new Intl.NumberFormat("ko-KR", {
                style: "currency",
                currency: "KRW",
                maximumFractionDigits: 0,
              }).format(viewModel.forecast.projectedAmount)}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
