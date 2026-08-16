import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AskCostChip } from "./AskCostChip";

describe("AskCostChip", () => {
  it("uses plain Survey labels", () => {
    render(<AskCostChip toolLabel="Radar" costLabel="D2P1" />);
    const chip = screen.getByTestId("ask-cost-chip");
    expect(chip).toHaveTextContent("Radar · D2P1");
    expect(chip).toHaveAttribute("data-survey", "true");
  });
});
