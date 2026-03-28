import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PeriodToggle } from "@/components/period-toggle";

describe("PeriodToggle", () => {
  it("renders both period options and changes active mode", () => {
    const onChange = vi.fn();

    render(<PeriodToggle value="week" onChange={onChange} />);

    expect(screen.getByRole("tab", { name: /주간/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /월간/i })).toHaveAttribute("aria-selected", "false");

    fireEvent.click(screen.getByRole("tab", { name: /월간/i }));

    expect(onChange).toHaveBeenCalledWith("month");
  });
});

