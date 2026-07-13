import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnimatedOverlay } from "./AnimatedOverlay";
import { resetAllStores } from "../../test/helpers/storeReset";

describe("AnimatedOverlay", { timeout: 20000 }, () => {
  beforeEach(() => {
    resetAllStores();
    document.documentElement.dataset.motion = "reduced";
  });

  it("renders dialog content when open", () => {
    render(
      <AnimatedOverlay open onClose={() => {}} ariaLabel="Test sheet">
        <p>Sheet body</p>
      </AnimatedOverlay>,
    );

    expect(screen.getByRole("dialog", { name: "Test sheet" })).toBeInTheDocument();
    expect(screen.getByText("Sheet body")).toBeInTheDocument();
  });

  it("unmounts after close with reduced motion", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <AnimatedOverlay open onClose={onClose} ariaLabel="Test sheet">
        <p>Sheet body</p>
      </AnimatedOverlay>,
    );

    fireEvent.click(screen.getByRole("dialog").closest(".hud-scrim")!);
    rerender(
      <AnimatedOverlay open={false} onClose={onClose} ariaLabel="Test sheet">
        <p>Sheet body</p>
      </AnimatedOverlay>,
    );

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("closes on Escape when dismissible", async () => {
    const onClose = vi.fn();
    render(
      <AnimatedOverlay open onClose={onClose} ariaLabel="Test sheet">
        <p>Sheet body</p>
      </AnimatedOverlay>,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    }, { timeout: 5000 });
  });
});
