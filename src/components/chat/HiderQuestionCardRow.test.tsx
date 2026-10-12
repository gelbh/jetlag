import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithAppUi } from "../../test/renderWithAppUi";
import { HiderQuestionCardRow } from "./HiderQuestionCardRow";

describe("HiderQuestionCardRow", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("needs a second tap to play", () => {
    const onPlay = vi.fn();
    renderWithAppUi(<HiderQuestionCardRow cards={["veto"]} resetKey="q1" onPlay={onPlay} />);
    fireEvent.click(screen.getByRole("button", { name: "Play Veto" }));
    expect(onPlay).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Tap again to play Veto" }));
    expect(onPlay).toHaveBeenCalledWith("veto");
  });

  it("disarms on Cancel", () => {
    const onPlay = vi.fn();
    renderWithAppUi(<HiderQuestionCardRow cards={["veto"]} resetKey="q1" onPlay={onPlay} />);
    fireEvent.click(screen.getByRole("button", { name: "Play Veto" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Play Veto" })).toBeInTheDocument();
  });

  it("disarms after 4 seconds", () => {
    renderWithAppUi(<HiderQuestionCardRow cards={["veto"]} resetKey="q1" onPlay={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Play Veto" }));
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByRole("button", { name: "Play Veto" })).toBeInTheDocument();
  });

  it("arming one card disarms the other", () => {
    renderWithAppUi(
      <HiderQuestionCardRow cards={["veto", "randomize"]} resetKey="q1" onPlay={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Play Veto" }));
    fireEvent.click(screen.getByRole("button", { name: "Play Randomize" }));
    expect(screen.getByRole("button", { name: "Play Veto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tap again to play Randomize" })).toBeInTheDocument();
  });
});
