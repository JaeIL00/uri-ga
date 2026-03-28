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
    <main className="min-h-screen bg-[color:var(--bg-canvas)] text-[color:var(--ink-strong)]">
      <div className="aurora" aria-hidden="true" />
      <div className="relative mx-auto flex w-full max-w-[92rem] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="hero-shell">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="eyebrow">Uri-Ga household console</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                {viewModel.familyName}의 돈 흐름을 한 화면에서 투명하게 봅니다.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--ink-soft)] sm:text-lg">
                {viewModel.displayName}님, 필요한 지출은 존중하고 다음 선택은 더 가볍게 만들 수 있도록
                이번 {mode === "month" ? "달" : "주"}의 리듬을 정리했어요.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3">
              <PeriodToggle value={mode} onChange={setMode} />
              <div className="rounded-full border border-[color:var(--line-soft)] bg-[color:var(--panel-strong)] px-4 py-2 text-sm text-[color:var(--ink-soft)]">
                <span className="font-semibold text-[color:var(--ink-strong)]">가족 코드</span>{" "}
                {viewModel.inviteCode}
                <span className="mx-2 text-[color:var(--line-strong)]">/</span>
                <span
                  className={
                    status === "live"
                      ? "text-[color:var(--success)]"
                      : "text-[color:var(--accent-strong)]"
                  }
                >
                  {status === "live" ? "실시간 연결" : status === "loading" ? "연결 중" : "로컬 샘플"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="핵심 지표">
          {viewModel.kpis.map((kpi) => (
            <article key={kpi.label} className={`metric-card metric-${kpi.tone}`}>
              <p className="text-sm text-[color:var(--ink-soft)]">{kpi.label}</p>
              <div className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{kpi.value}</div>
              <p className="mt-3 text-sm text-[color:var(--ink-soft)]">{kpi.hint}</p>
            </article>
          ))}
        </section>

        {errorMessage ? (
          <div className="rounded-[1.25rem] border border-[color:var(--line-soft)] bg-[color:var(--panel-strong)] px-4 py-3 text-sm text-[color:var(--ink-soft)]">
            API 응답을 기다리는 동안 샘플 데이터를 보여주고 있습니다. {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1.1fr_1.3fr]" aria-label="차트 영역">
          <ExpenseDonut data={viewModel.categories} totalExpense={viewModel.totalExpense} />
          <div className="flex flex-col gap-3">
            <div className="rounded-full border border-[color:var(--line-soft)] bg-[color:var(--panel-strong)] px-4 py-2 text-sm text-[color:var(--ink-soft)]">
              상세 구간: <span className="font-semibold text-[color:var(--ink-strong)]">{selectedWindowLabel}</span>
            </div>
            <SpendingTrend data={viewModel.trend} range={range} onRangeChange={setRange} />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]" aria-label="비교와 고정비">
          <CategoryComparison data={viewModel.categories} />

          <div className="panel-card">
            <div className="panel-heading">
              <div>
                <p className="panel-eyebrow">Baseline Overlay</p>
                <h3 className="panel-title">고정비 현황</h3>
              </div>
            </div>
            <div className="grid gap-3">
              {viewModel.fixedCosts.map((cost) => (
                <article
                  key={cost.category}
                  className="rounded-[1.2rem] border border-[color:var(--line-soft)] bg-[color:var(--panel-muted)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-[color:var(--ink-soft)]">{cost.category}</div>
                      <div className="mt-1 text-xl font-semibold">{formatCurrency(cost.amount)}</div>
                    </div>
                    <div
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor:
                          cost.trend === "down"
                            ? "rgba(15, 118, 110, 0.14)"
                            : cost.trend === "up"
                              ? "rgba(220, 38, 38, 0.12)"
                              : "rgba(100, 116, 139, 0.12)",
                        color:
                          cost.trend === "down"
                            ? "var(--success)"
                            : cost.trend === "up"
                              ? "var(--danger)"
                              : "var(--ink-soft)",
                      }}
                    >
                      {cost.trend === "down"
                        ? "전월보다 안정"
                        : cost.trend === "up"
                          ? "전월보다 증가"
                          : "전월과 유사"}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-[color:var(--ink-soft)]">{viewModel.feedback}</p>
          </div>
        </section>

        <MonthlyReport viewModel={viewModel} />

        <section className="panel-card" aria-label="최근 내역">
          <div className="panel-heading">
            <div>
              <p className="panel-eyebrow">Transparent Ledger</p>
              <h3 className="panel-title">실시간 공동 내역</h3>
            </div>
            <p className="text-sm text-[color:var(--ink-soft)]">
              삭제된 내역은 숨겨지지만 감사 로그에서 계속 추적됩니다.
            </p>
          </div>
          <div className="grid gap-3">
            {viewModel.transactionItems.map((transaction) => (
              <article
                key={transaction.id}
                className="grid gap-3 rounded-[1.2rem] border border-[color:var(--line-soft)] bg-[color:var(--panel-muted)] p-4 sm:grid-cols-[1.2fr_0.8fr_auto]"
              >
                <div>
                  <div className="text-sm text-[color:var(--ink-soft)]">{transaction.category}</div>
                  <div className="mt-1 text-lg font-semibold text-[color:var(--ink-strong)]">
                    {transaction.description ?? "메모 없음"}
                  </div>
                </div>
                <div className="text-sm text-[color:var(--ink-soft)]">
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
                    transaction.tone === "income"
                      ? "text-[color:var(--success)]"
                      : "text-[color:var(--ink-strong)]"
                  }`}
                >
                  {transaction.tone === "income" ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
