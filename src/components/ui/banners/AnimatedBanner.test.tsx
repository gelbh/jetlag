import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetAllStores } from "@/test/helpers/storeReset";
import { AnimatedBanner } from "./AnimatedBanner";

describe("AnimatedBanner", () => {
  beforeEach(() => {
    resetAllStores();
    document.documentElement.dataset.motion = "reduced";
  });

  it("unmounts after visible becomes false with reduced motion", async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <AnimatedBanner visible onDismiss={onDismiss}>
        <p role="status">Timer alert</p>
      </AnimatedBanner>,
    );

    rerender(
      <AnimatedBanner visible={false} onDismiss={onDismiss}>
        <p role="status">Timer alert</p>
      </AnimatedBanner>,
    );

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });
});
