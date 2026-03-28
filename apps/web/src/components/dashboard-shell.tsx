"use client";

import { startTransition, useDeferredValue, useEffect, useEffectEvent, useState } from "react";
import { CategoryComparison, ExpenseDonut, SpendingTrend } from "@/components/charts";
import { MonthlyReport } from "@/components/monthly-report";
import { PeriodToggle } from "@/components/period-toggle";
import { apiClient, parseFamilyEvent } from "@/lib/api";
import { createDashboardViewModel } from "@/lib/dashboard";
import { getMockDashboardBundle } from "@/lib/mock-data";
import type { DashboardBundle, PeriodMode } from "@/lib/types";

type DashboardShellProps = {
  initialMode?: PeriodMode;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardShell({ initialMode = "month" }: DashboardShellProps) {
  const initialBundle = getMockDashboardBundle(initialMode);
  const [mode, setMode] = useState<PeriodMode>(initialMode);
  const [bundle, setBundle] = useState<DashboardBundle>(initialBundle);
  const [status, setStatus] = useState<"live" | "mock" | "loading">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [range, setRange] = useState<[number, number]>([
    0,
    Math.max(initialBundle.report.analysisJson.trend.length - 1, 0),
  ]);

  const deferredRange = useDeferredValue(range);

  const reloadBundle = useEffectEvent(async (nextMode: PeriodMode) => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const nextBundle = await apiClient.getDashboardBundle(nextMode);
      startTransition(() => {
        setBundle(nextBundle);
        setRange([0, Math.max(nextBundle.report.analysisJson.trend.length - 1, 0)]);
        setStatus(
          nextBundle.session.familyId === "family-uri-ga" && process.env.NODE_ENV !== "production"
            ? "mock"
            : "live",
        );
      });
    } catch (error) {
      const fallbackBundle = getMockDashboardBundle(nextMode);
      startTransition(() => {
        setBundle(fallbackBundle);
        setRange([0, Math.max(fallbackBundle.report.analysisJson.trend.length - 1, 0)]);
        setStatus("mock");
        setErrorMessage(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.");
      });
    }
  });

  useEffect(() => {
    void reloadBundle(mode);
  }, [mode]);

  const handleEvent = useEffectEvent((event: MessageEvent<string>) => {
    const parsed = parseFamilyEvent(event);
    if (!parsed || parsed.familyId !== bundle.session.familyId) {
      return;
    }

    startTransition(() => {
      void reloadBundle(mode);
    });
  });

  useEffect(() => {
    if (!bundle.session.familyId) {
      return;
    }

    const source = apiClient.createFamilyEventSource(bundle.session.familyId);
    source.onmessage = handleEvent;
    source.onerror = () => {
      source.close();
      setStatus((current) => (current === "live" ? "mock" : current));
    };

    return () => {
      source.close();
    };
  }, [bundle.session.familyId, mode]);

  const viewModel = createDashboardViewModel(bundle, mode);
  const selectedWindowLabel = `${viewModel.trend[deferredRange[0]]?.label ?? ""} - ${
    viewModel.trend[deferredRange[1]]?.label ?? ""
  }`;

  return (
    <main className="min-h-screen bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      <div className="page-atmosphere" aria-hidden="true" />

      <div className="shell-wrap mx-auto flex w-full max-w-[96rem] flex-col gap-9 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="hero-shell rise-in">
          <div className="grid items-start gap-8 xl:grid-cols-[1.35fr_0.85fr]">
            <div className="xl:pr-8">
              <p className="eyebrow">The Digital Sanctuary</p>
              <h1 className="hero-title mt-4">{viewModel.familyName}의 흐름을 숨김 없이, 부드럽게.</h1>
              <p className="hero-copy mt-6">
                {viewModel.displayName}님, 이번 {mode === "month" ? "달" : "주"}은 숫자를 밀어붙이기보다
                리듬을 다듬는 방식으로 가보세요. 차분한 간격이 쌓이면 큰 목표가 더 빨리 가까워져요.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <PeriodToggle value={mode} onChange={setMode} />
                <div className="floating-pill px-5 py-3 text-sm text-[color:var(--on-surface-soft)]">
                  집중 구간 <span className="ml-2 font-semibold text-[color:var(--on-surface)]">{selectedWindowLabel}</span>
                </div>
              </div>
            </div>

            <aside className="glass-float p-6 xl:translate-y-10">
              <p className="eyebrow">Family Channel</p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.02em] text-[color:var(--on-surface)]">
                {viewModel.inviteCode}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[color:var(--on-surface-soft)]">
                데이터는 모두 가족 채널 단위로 동기화됩니다. 감추는 모드 없이 동일한 화면을 공유합니다.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="section-tone-mid">
                  <p className="text-xs uppercase tracking-[0.15em] text-[color:var(--on-surface-soft)]">총 지출</p>
                  <p className="mt-2 text-xl font-semibold tracking-[-0.02em]">{formatCurrency(viewModel.totalExpense)}</p>
                </div>
                <div className="section-tone-mid">
                  <p className="text-xs uppercase tracking-[0.15em] text-[color:var(--on-surface-soft)]">연결 상태</p>
                  <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[color:var(--primary)]">
                    {status === "live" ? "실시간 연결" : status === "loading" ? "연결 중" : "로컬 샘플"}
                  </p>
                </div>
              </div>

              <button type="button" className="pill-cta mt-7 w-full px-5 py-3 font-semibold">
                이번 리듬 유지하기
              </button>
            </aside>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-12 rise-in delay-1" aria-label="핵심 지표">
          {viewModel.kpis.map((kpi, index) => (
            <article
              key={kpi.label}
              className={`metric-card metric-${kpi.tone} ${
                index === 0 ? "xl:col-span-6" : "xl:col-span-2"
              }`}
            >
              <p className="text-sm text-[color:var(--on-surface-soft)]">{kpi.label}</p>
              <div className="mt-3 text-3xl font-bold tracking-[-0.02em]">{kpi.value}</div>
              <p className="mt-4 text-sm leading-6 text-[color:var(--on-surface-soft)]">{kpi.hint}</p>
            </article>
          ))}
        </section>

        {errorMessage ? (
          <div className="glass-float rise-in delay-2 px-5 py-4 text-sm leading-7 text-[color:var(--on-surface-soft)]">
            API 응답을 기다리는 동안 샘플 데이터를 보여주고 있습니다. {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr] rise-in delay-2" aria-label="차트 영역">
          <div className="section-tone-low">
            <ExpenseDonut data={viewModel.categories} totalExpense={viewModel.totalExpense} />
          </div>

          <div className="section-tone-low">
            <SpendingTrend data={viewModel.trend} range={range} onRangeChange={setRange} />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr] rise-in delay-3" aria-label="비교와 고정비">
          <div className="section-tone-low">
            <CategoryComparison data={viewModel.categories} />
          </div>

          <div className="section-tone-low">
            <div className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="panel-eyebrow">Baseline Overlay</p>
                  <h3 className="panel-title">고정비 현황</h3>
                </div>
              </div>

              <div className="grid gap-3">
                {viewModel.fixedCosts.map((cost) => (
                  <article key={cost.category} className="section-tone-mid">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-[color:var(--on-surface-soft)]">{cost.category}</div>
                        <div className="mt-1 text-xl font-semibold tracking-[-0.02em]">{formatCurrency(cost.amount)}</div>
                      </div>
                      <div className="rounded-full bg-[rgba(94,146,243,0.16)] px-3 py-1 text-xs font-semibold text-[color:var(--primary)]">
                        {cost.trend === "down" ? "전월보다 안정" : cost.trend === "up" ? "전월보다 증가" : "전월과 유사"}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <p className="mt-5 text-sm leading-7 text-[color:var(--on-surface-soft)]">{viewModel.feedback}</p>
            </div>
          </div>
        </section>

        <div className="rise-in delay-3">
          <MonthlyReport viewModel={viewModel} />
        </div>

        <section className="section-tone-low rise-in delay-4" aria-label="최근 내역">
          <div className="panel-card">
            <div className="panel-heading">
              <div>
                <p className="panel-eyebrow">Transparent Ledger</p>
                <h3 className="panel-title">실시간 공동 내역</h3>
              </div>
              <p className="max-w-[20rem] text-sm leading-7 text-[color:var(--on-surface-soft)]">
                삭제된 내역은 목록에서 숨기되, 감사 로그에서 변경 이력을 계속 추적합니다.
              </p>
            </div>

            <div className="grid gap-3">
              {viewModel.transactionItems.map((transaction) => (
                <article
                  key={transaction.id}
                  className="grid gap-3 rounded-2xl bg-[color:var(--surface-container)] p-4 sm:grid-cols-[1.25fr_0.75fr_auto]"
                >
                  <div>
                    <div className="text-sm text-[color:var(--on-surface-soft)]">{transaction.category}</div>
                    <div className="mt-1 text-lg font-semibold text-[color:var(--on-surface)]">
                      {transaction.description ?? "메모 없음"}
                    </div>
                  </div>

                  <div className="text-sm text-[color:var(--on-surface-soft)]">
                    {new Intl.DateTimeFormat("ko-KR", {
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(transaction.transactionAt))}
                  </div>

                  <div
                    className={`text-right text-lg font-semibold ${
                      transaction.tone === "income" ? "text-[color:var(--primary)]" : "text-[color:var(--on-surface)]"
                    }`}
                  >
                    {transaction.tone === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
