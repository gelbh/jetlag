import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { LearnShowcaseFrame } from "./LearnShowcaseFrame";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock("@/services/core/analytics/lazyTelemetry", () => ({ trackLazy: track }));

function renderFrame(child: ReactNode = <button type="button">Pick 500 m</button>) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <MemoryRouter initialEntries={["/tools/radar"]}>
        <LearnShowcaseFrame showcase="radar" caption="Radar demo">
          {child}
        </LearnShowcaseFrame>
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("LearnShowcaseFrame", () => {
  beforeEach(() => {
    track.mockClear();
  });

  it("tracks only the first pointer interaction per mount", () => {
    renderFrame();
    const button = screen.getByRole("button", { name: "Pick 500 m" });
    fireEvent.pointerDown(button);
    fireEvent.pointerDown(button);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("learn_showcase_interacted", {
      showcase: "radar",
      path: "/tools/radar",
    });
  });

  it("tracks a keyboard-only interaction", () => {
    renderFrame();
    fireEvent.keyDown(screen.getByRole("button", { name: "Pick 500 m" }), { key: "Enter" });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("learn_showcase_interacted", {
      showcase: "radar",
      path: "/tools/radar",
    });
  });

  it("tracks even when the demo stops propagation", () => {
    renderFrame(
      <button type="button" onPointerDown={(e) => e.stopPropagation()}>
        Pick 500 m
      </button>,
    );
    fireEvent.pointerDown(screen.getByRole("button", { name: "Pick 500 m" }));
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("does not track without interaction", () => {
    renderFrame();
    expect(track).not.toHaveBeenCalled();
  });
});
