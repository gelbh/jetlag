import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AskMapPlacementChrome } from "./AskMapPlacementChrome";

describe("AskMapPlacementChrome answer-phase errors", () => {
  it("shows inline error detail when phase is answer", () => {
    render(
      <AskMapPlacementChrome
        testId="measuring-map-placement"
        toolTitle="Measuring"
        configureLabel="Museum"
        questionPrompt="Is it closer or further?"
        phase="answer"
        onUseGps={vi.fn()}
        error="Couldn't save this measuring question."
        statusTitle=""
        statusBody=""
        toolIcon={<span />}
        answerSlot={<div data-testid="answer-slot">answers</div>}
      />,
    );

    const alert = screen.getByTestId("measuring-map-placement-answer-error");
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert.textContent).toMatch(/Couldn't save this measuring question/i);
    expect(screen.getByTestId("answer-slot")).toBeInTheDocument();
  });
});
