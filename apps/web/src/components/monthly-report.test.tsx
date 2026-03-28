import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthlyReport } from "@/components/monthly-report";
import { createDashboardViewModel } from "@/lib/dashboard";
import { getMockDashboardBundle } from "@/lib/mock-data";

describe("MonthlyReport", () => {
  it("renders all four report blocks with warm guidance copy", () => {
    const viewModel = createDashboardViewModel(getMockDashboardBundle("month"), "month");

    render(<MonthlyReport viewModel={viewModel} />);

    expect(screen.getByText("0. 이달 요약")).toBeInTheDocument();
    expect(screen.getByText("1. 주요 소비 흐름")).toBeInTheDocument();
    expect(screen.getByText("2. 가족 협력 리포트")).toBeInTheDocument();
    expect(screen.getByText("3. 다정한 예측 가이드")).toBeInTheDocument();
    expect(screen.getByText(/가족 여행 자금 준비 흐름/i)).toBeInTheDocument();
  });
});
