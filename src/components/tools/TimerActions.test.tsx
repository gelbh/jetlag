import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimerActions } from "./TimerActions";
import { renderWithRouter } from "../../test/renderWithRouter";

describe("TimerActions", () => {
  it("starts and pauses the timer", () => {
    const onTimerStart = vi.fn();
    const onTimerPause = vi.fn();

    renderWithRouter(
      <TimerActions
        timerRunning={false}
        timerHasStarted={false}
        onTimerStart={onTimerStart}
        onTimerPause={onTimerPause}
        onTimerReset={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onTimerStart).toHaveBeenCalled();
  });

  it("shows pause when the timer is running", () => {
    renderWithRouter(
      <TimerActions
        timerRunning
        timerHasStarted
        onTimerStart={vi.fn()}
        onTimerPause={vi.fn()}
        onTimerReset={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });
});
