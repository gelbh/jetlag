import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getQuestionTutorial } from "../../domain/tutorial/tutorialQuestions";
import { renderWithRouter } from "../../test/renderWithRouter";
import { TutorialSectionWizard } from "./TutorialSectionWizard";

vi.mock("../map/MapView", () => ({
  MapView: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="tutorial-map-preview">{children}</div>
  ),
}));

vi.mock("./previews/TutorialMapContextPreview", () => ({
  TutorialMapContextPreview: () => <div data-testid="tutorial-map-context" />,
}));

vi.mock("./previews/TutorialMapPreview", () => ({
  TutorialMapPreview: () => <div data-testid="tutorial-map-result" />,
}));

describe("TutorialSectionWizard live previews", () => {
  it("renders the interactive matching panel on step 1", () => {
    const matching = getQuestionTutorial("matching");
    renderWithRouter(
      <TutorialSectionWizard
        section={{ ...matching, kind: "question" }}
        onStepComplete={vi.fn()}
        onBackFromStart={vi.fn()}
        onFinish={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Try the wizard" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Got it" })).toBeInTheDocument();
  });

  it("renders split panel previews on the session-mode step", () => {
    const matching = getQuestionTutorial("matching");
    renderWithRouter(
      <TutorialSectionWizard
        section={{ ...matching, kind: "question" }}
        initialStepIndex={1}
        onStepComplete={vi.fn()}
        onBackFromStart={vi.fn()}
        onFinish={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Solo vs hiders" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Solo — you answer")).toBeInTheDocument();
    expect(screen.getByText("Hiders — send to chat")).toBeInTheDocument();
  });

  it("shows walkthrough back navigation and a 3-step counter", () => {
    const matching = getQuestionTutorial("matching");
    renderWithRouter(
      <TutorialSectionWizard
        section={{ ...matching, kind: "question" }}
        initialStepIndex={2}
        onStepComplete={vi.fn()}
        onBackFromStart={vi.fn()}
        onFinish={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Previous step" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
