import { describe, expect, it } from "vitest";
import { WizardStepFooter } from "./WizardStepFooter";
import { WizardStepNav } from "./WizardStepNav";
import { render, screen } from "@testing-library/react";

describe("WizardStepNav", () => {
  it("shows next on step one and hides back", () => {
    render(
      <WizardStepNav
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
      <WizardStepNav
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

describe("WizardStepFooter", () => {
  it("renders extra links with back navigation on the last step", () => {
    render(
      <WizardStepFooter
        stepIndex={3}
        stepCount={4}
        onBack={() => {}}
        onNext={() => {}}
        extra={<a href="/next">Next section</a>}
      />,
    );

    expect(screen.getByLabelText("Previous step")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next section" })).toBeInTheDocument();
  });

  it("shows a labeled primary button when primaryLabel is set", () => {
    render(
      <WizardStepFooter
        stepIndex={0}
        stepCount={3}
        onBack={() => {}}
        onNext={() => {}}
        primaryLabel="Continue"
      />,
    );

    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });
});
