"use client";

import type { PeriodMode } from "@/lib/types";

type PeriodToggleProps = {
  value: PeriodMode;
  onChange: (mode: PeriodMode) => void;
};

const options: Array<{ value: PeriodMode; label: string; caption: string }> = [
  { value: "week", label: "주간", caption: "이번 주 호흡" },
  { value: "month", label: "월간", caption: "이번 달 큰 흐름" },
];

export function PeriodToggle({ value, onChange }: PeriodToggleProps) {
  return (
    <div
      className="inline-grid grid-cols-2 gap-2 rounded-[1.4rem] border border-[color:var(--line-soft)] bg-[color:var(--panel-strong)] p-2 shadow-[0_16px_40px_rgba(13,23,37,0.12)]"
      role="tablist"
      aria-label="리포트 기간 전환"
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`min-w-[8.5rem] rounded-[1rem] px-4 py-3 text-left transition ${
              active
                ? "bg-[color:var(--accent-strong)] text-white"
                : "bg-transparent text-[color:var(--ink-soft)] hover:bg-[color:var(--panel-muted)]"
            }`}
          >
            <div className="text-sm font-semibold tracking-[0.18em] uppercase">
              {option.label}
            </div>
            <div className="mt-1 text-xs opacity-85">{option.caption}</div>
          </button>
        );
      })}
    </div>
  );
}

