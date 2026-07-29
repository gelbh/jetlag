import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HudErrorBanner } from "./HudErrorBanner";

describe("HudErrorBanner", () => {
  it("renders retry and return to join actions", () => {
    const onRetry = vi.fn();
    const onReturnToJoin = vi.fn();

    render(
      <HudErrorBanner
        error={{
          title: "Session gone",
          message: "That session no longer exists.",
          action: "retry",
          actionLabel: "Retry",
          secondaryAction: "rejoin",
          secondaryActionLabel: "Return to join",
        }}
        onAction={onRetry}
        onSecondaryAction={onReturnToJoin}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByRole("button", { name: "Return to join" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onReturnToJoin).toHaveBeenCalledTimes(1);
  });
});
