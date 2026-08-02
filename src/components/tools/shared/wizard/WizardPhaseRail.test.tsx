import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WizardPhaseRail } from "./WizardPhaseRail";

describe("WizardPhaseRail", () => {
  const phases = [
    { id: "place", label: "Place" },
    { id: "configure", label: "Configure" },
    { id: "ask", label: "Ask" },
  ] as const;

  it("marks the current phase and completed predecessors", () => {
    render(
      <WizardPhaseRail
        phases={phases}
        currentPhaseId="configure"
        completePhaseIds={["place"]}
      />,
    );

    expect(screen.getByRole("listitem", { name: "Place" })).toHaveClass(
      "bg-action/60",
    );
    expect(screen.getByRole("listitem", { name: "Configure" })).toHaveClass(
      "bg-action",
    );
    expect(screen.getByRole("listitem", { name: "Ask" })).toHaveClass(
      "bg-surface-panel",
    );
  });
});
