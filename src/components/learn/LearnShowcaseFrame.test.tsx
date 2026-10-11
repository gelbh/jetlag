import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { LearnShowcaseFrame } from "./LearnShowcaseFrame";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock("@/services/core/analytics/lazyTelemetry", () => ({ trackLazy: track }));

function renderFrame(child: ReactNode = <button type="button">Pick 500 m</button>) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <LearnShowcaseFrame showcase="radar" caption="Radar demo">
        {child}
      </LearnShowcaseFrame>
    </MantineProvider>,
  );
}

describe("LearnShowcaseFrame", () => {
  beforeEach(() => {
    track.mockClear();
  });

  it("tracks only the first click per mount", () => {
    renderFrame();
    const button = screen.getByRole("button", { name: "Pick 500 m" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("learn_showcase_interacted", { showcase: "radar" });
  });

  it("tracks even when the demo stops propagation", () => {
    renderFrame(
      <button type="button" onClick={(e) => e.stopPropagation()}>
        Pick 500 m
      </button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Pick 500 m" }));
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("tracks an input change", () => {
    renderFrame(<input aria-label="Distance" defaultValue="" />);
    fireEvent.change(screen.getByLabelText("Distance"), { target: { value: "5" } });
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("does not track a pointerdown alone (touch scroll)", () => {
    renderFrame();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Pick 500 m" }));
    expect(track).not.toHaveBeenCalled();
  });

  it("does not track a Tab keydown alone", () => {
    renderFrame();
    fireEvent.keyDown(screen.getByRole("button", { name: "Pick 500 m" }), { key: "Tab" });
    expect(track).not.toHaveBeenCalled();
  });

  it("does not track without interaction", () => {
    renderFrame();
    expect(track).not.toHaveBeenCalled();
  });
});
