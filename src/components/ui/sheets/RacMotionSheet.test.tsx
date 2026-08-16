import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RacMotionSheet } from "./RacMotionSheet";
import { SHEET_VELOCITY_DISMISS_PX_MS } from "@/domain/device/motion/motionTokens";
import { setPlayerUxWorldFlagForTests } from "@/services/core/analytics/playerUxWorldFlag";

const useMotionProfile = vi.fn(() => ({
  animate: true,
  decorativeAnimate: true,
  lowPowerMode: false,
  prefersReducedMotion: false,
}));

vi.mock("@/hooks/motion/useMotionProfile", () => ({
  useMotionProfile: () => useMotionProfile(),
  usePrefersReducedMotion: () => false,
}));

vi.mock("@/hooks/layout/useScrollLock", () => ({
  useScrollLock: () => undefined,
}));

vi.mock("posthog-js", () => ({
  default: {
    isFeatureEnabled: () => undefined,
    onFeatureFlags: () => () => {},
  },
}));

const MOTION_DOM_SKIP = new Set([
  "initial",
  "animate",
  "transition",
  "style",
  "drag",
  "dragControls",
  "dragListener",
  "dragConstraints",
  "dragElastic",
]);

type DragEndHandler = (
  event: unknown,
  info: { offset: { y: number }; velocity: { y: number } },
) => void;

let latestOnDragEnd: DragEndHandler | undefined;

vi.mock("motion/react", async () => {
  const React = await import("react");
  const Passthrough = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
      children?: React.ReactNode;
      onDragEnd?: DragEndHandler;
    }
  >(function MotionDiv({ children, onDragEnd, ...rest }, ref) {
    latestOnDragEnd = onDragEnd;
    const dom: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest as Record<string, unknown>)) {
      if (!MOTION_DOM_SKIP.has(key)) {
        dom[key] = value;
      }
    }
    return (
      <div ref={ref} {...(dom as React.HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  });
  return {
    motion: { div: Passthrough },
    useDragControls: () => ({ start: vi.fn() }),
    useMotionValue: () => ({ set: vi.fn(), get: () => 0 }),
    useReducedMotion: () => false,
    animate: vi.fn(),
  };
});

describe("RacMotionSheet", () => {
  beforeEach(() => {
    latestOnDragEnd = undefined;
    setPlayerUxWorldFlagForTests(null);
    useMotionProfile.mockReturnValue({
      animate: true,
      decorativeAnimate: true,
      lowPowerMode: false,
      prefersReducedMotion: false,
    });
  });

  it("exposes a dialog and closes on Escape when dismissible", async () => {
    const onClose = vi.fn();
    render(
      <RacMotionSheet open onClose={onClose} ariaLabel="Tools">
        <button type="button">inside</button>
      </RacMotionSheet>,
    );

    const dialog = await screen.findByRole("dialog", { name: "Tools" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "inside" })).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("defaults dialog name when ariaLabel is omitted", async () => {
    render(
      <RacMotionSheet open onClose={() => {}}>
        <p>unnamed</p>
      </RacMotionSheet>,
    );
    expect(await screen.findByRole("dialog", { name: "Sheet" })).toBeInTheDocument();
  });

  it("marks survey world on the overlay when flag is on", async () => {
    setPlayerUxWorldFlagForTests(true);
    render(
      <RacMotionSheet open onClose={() => {}} ariaLabel="Survey sheet">
        <p>body</p>
      </RacMotionSheet>,
    );
    await screen.findByRole("dialog", { name: "Survey sheet" });
    expect(
      document.querySelector('[data-player-ux-world="survey"]'),
    ).not.toBeNull();
    expect(document.querySelector(".jl-survey-world")).not.toBeNull();
  });

  it("dismisses via drag-end past fraction or velocity", async () => {
    const onClose = vi.fn();
    render(
      <RacMotionSheet open onClose={onClose} ariaLabel="Drag">
        <p>body</p>
      </RacMotionSheet>,
    );
    await screen.findByRole("dialog", { name: "Drag" });
    expect(latestOnDragEnd).toBeTypeOf("function");

    // jsdom sheet height is small; use oversized offset / velocity vs live measure.
    latestOnDragEnd?.({}, { offset: { y: 1 }, velocity: { y: 0 } });
    expect(onClose).not.toHaveBeenCalled();

    latestOnDragEnd?.({}, { offset: { y: 10_000 }, velocity: { y: 0 } });
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    latestOnDragEnd?.({}, {
      offset: { y: 1 },
      velocity: { y: SHEET_VELOCITY_DISMISS_PX_MS * 1000 + 1 },
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("skips drag handle when reduced-motion / low-power profile", async () => {
    useMotionProfile.mockReturnValue({
      animate: false,
      decorativeAnimate: false,
      lowPowerMode: true,
      prefersReducedMotion: true,
    });
    render(
      <RacMotionSheet open onClose={() => {}} ariaLabel="Quiet">
        <p>still</p>
      </RacMotionSheet>,
    );
    await screen.findByRole("dialog", { name: "Quiet" });
    expect(
      screen.queryByRole("button", { name: "Drag sheet down to dismiss" }),
    ).not.toBeInTheDocument();
  });

  it("renders nothing meaningful when closed", () => {
    const { container } = render(
      <RacMotionSheet open={false} onClose={() => {}} ariaLabel="Closed">
        <p>hidden</p>
      </RacMotionSheet>,
    );
    expect(screen.queryByText("hidden")).not.toBeInTheDocument();
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });
});
