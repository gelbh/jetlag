import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { AskCostChip } from "./AskCostChip";

describe("AskCostChip", () => {
  it("uses plain Survey labels", () => {
    renderWithAppUi(<AskCostChip toolLabel="Radar" costLabel="D2P1" />);
    const chip = screen.getByTestId("ask-cost-chip");
    expect(chip).toHaveTextContent("Radar · D2P1");
    expect(chip).toHaveAttribute("role", "status");
  });
});
