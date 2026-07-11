import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tutorial } from "./Tutorial";
import { defaultQuestionProgress } from "../domain/tutorial/tutorialQuestions";
import { renderWithRouter } from "../test/renderWithRouter";

const completeStep = vi.fn();
const completeQuestionStep = vi.fn();

vi.mock("../hooks/useTutorialProgress", () => ({
  useTutorialProgress: () => ({
    progress: {
      core: 6,
      tools: -1,
      hider: -1,
      extras: -1,
      coreComplete: true,
      questions: defaultQuestionProgress(),
    },
    completeStep,
    completeQuestionStep,
  }),
}));

describe("Tutorial", () => {
  it("shows the hub when core tutorial is complete", () => {
    renderWithRouter(<Tutorial />);

    expect(
      screen.getByRole("heading", { name: "Tutorial" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Questions/i }),
    ).toBeInTheDocument();
  });

  it("opens the questions hub from the main hub", () => {
    renderWithRouter(<Tutorial />);

    fireEvent.click(screen.getByRole("button", { name: /Questions/i }));

    expect(
      screen.getByRole("heading", { name: "Questions" }),
    ).toBeInTheDocument();
  });

  it("links back to home from the hub header", () => {
    renderWithRouter(<Tutorial />);

    expect(screen.getByRole("link", { name: /Back/i })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
