import { describe, expect, it } from "vitest";
import { WizardStepFooter } from "./WizardStepFooter";
import { render, screen } from "@testing-library/react";

describe("WizardStepFooter", () => {
  it("shows next on middle steps and hides back on step one", () => {
    render(
      <WizardStepFooter
        stepIndex={0}
        stepCount={4}
        onBack={() => {}}
        onNext={() => {}}
      />,
    );

    expect(screen.queryByLabelText("Previous step")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Next step")).toBeInTheDocument();
  });

  it("shows back and next on middle steps", () => {
    render(
      <WizardStepFooter
        stepIndex={1}
        stepCount={4}
        onBack={() => {}}
        onNext={() => {}}
      />,
    );

    expect(screen.getByLabelText("Previous step")).toBeInTheDocument();
    expect(screen.getByLabelText("Next step")).toBeInTheDocument();
  });
});
