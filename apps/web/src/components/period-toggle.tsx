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
      className="floating-pill inline-grid grid-cols-2 gap-1.5 p-1.5"
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
            className={`min-w-[8.8rem] rounded-full px-4 py-3 text-left transition ${
              active
                ? "pill-cta"
                : "bg-transparent text-[color:var(--on-surface-soft)] hover:bg-[color:var(--surface-container-high)]"
            }`}
          >
            <div className="text-sm font-semibold tracking-[0.14em] uppercase">
              {option.label}
            </div>
            <div className="mt-1 text-[11px] opacity-80">{option.caption}</div>
          </button>
        );
      })}
    </div>
  );
}
