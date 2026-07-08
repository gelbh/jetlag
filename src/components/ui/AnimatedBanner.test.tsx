import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnimatedBanner } from "./AnimatedBanner";
import { resetAllStores } from "../../test/helpers/storeReset";

describe("AnimatedBanner", () => {
  beforeEach(() => {
    resetAllStores();
    document.documentElement.dataset.motion = "reduced";
  });

  it("renders children when visible", () => {
    render(
      <AnimatedBanner visible>
        <p role="status">Timer alert</p>
      </AnimatedBanner>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Timer alert");
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
