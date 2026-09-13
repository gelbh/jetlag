import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RadixMotionSheet } from "./RadixMotionSheet";
import {
  SHEET_DISMISS_FRACTION,
  SHEET_VELOCITY_DISMISS_PX_MS,
} from "@/domain/device/motion/motionTokens";

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

describe("RadixMotionSheet", () => {
  beforeEach(() => {
    latestOnDragEnd = undefined;
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
      <RadixMotionSheet open onClose={onClose} ariaLabel="Tools">
        <button type="button">inside</button>
      </RadixMotionSheet>,
    );

    const dialog = await screen.findByRole("dialog", { name: "Tools" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "inside" })).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("defaults dialog name when ariaLabel is omitted", async () => {
    render(
      <RadixMotionSheet open onClose={() => {}}>
        <p>unnamed</p>
      </RadixMotionSheet>,
    );
    expect(await screen.findByRole("dialog", { name: "Sheet" })).toBeInTheDocument();
  });

  it("marks survey world on the overlay", async () => {
    render(
      <RadixMotionSheet open onClose={() => {}} ariaLabel="Survey sheet">
        <p>body</p>
      </RadixMotionSheet>,
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
      <RadixMotionSheet open onClose={onClose} ariaLabel="Drag">
        <p>body</p>
      </RadixMotionSheet>,
    );
    await screen.findByRole("dialog", { name: "Drag" });
    expect(latestOnDragEnd).toBeTypeOf("function");

    // Default measure fallback is 320px → fraction threshold is strict >
    // SHEET_DISMISS_FRACTION * 320.
    const height = 320;
    const fractionPx = height * SHEET_DISMISS_FRACTION;
    const velocityThreshold = SHEET_VELOCITY_DISMISS_PX_MS * 1000;

    latestOnDragEnd?.({}, { offset: { y: fractionPx }, velocity: { y: 0 } });
    expect(onClose).not.toHaveBeenCalled();

    latestOnDragEnd?.({}, {
      offset: { y: fractionPx + 1 },
      velocity: { y: 0 },
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    latestOnDragEnd?.({}, {
      offset: { y: 1 },
      velocity: { y: velocityThreshold },
    });
    expect(onClose).not.toHaveBeenCalled();

    latestOnDragEnd?.({}, {
      offset: { y: 1 },
      velocity: { y: velocityThreshold + 1 },
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
      <RadixMotionSheet open onClose={() => {}} ariaLabel="Quiet">
        <p>still</p>
      </RadixMotionSheet>,
    );
    await screen.findByRole("dialog", { name: "Quiet" });
    expect(
      screen.queryByRole("button", { name: "Drag sheet down to dismiss" }),
    ).not.toBeInTheDocument();
  });

  it("renders nothing meaningful when closed", () => {
    const { container } = render(
      <RadixMotionSheet open={false} onClose={() => {}} ariaLabel="Closed">
        <p>hidden</p>
      </RadixMotionSheet>,
    );
    expect(screen.queryByText("hidden")).not.toBeInTheDocument();
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });

  it("does not close on Escape when not dismissible", async () => {
    const onClose = vi.fn();
    render(
      <RadixMotionSheet
        open
        onClose={onClose}
        dismissible={false}
        ariaLabel="Locked"
      >
        <button type="button">inside</button>
      </RadixMotionSheet>,
    );
    const dialog = await screen.findByRole("dialog", { name: "Locked" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when the scrim (overlay) is clicked", async () => {
    const onClose = vi.fn();
    render(
      <RadixMotionSheet open onClose={onClose} ariaLabel="Scrim">
        <p>body</p>
      </RadixMotionSheet>,
    );
    await screen.findByRole("dialog", { name: "Scrim" });
    const overlay = document.querySelector(".hud-scrim");
    expect(overlay).not.toBeNull();
    // Radix outside-dismiss listens for pointerdown then click; both needed in jsdom.
    fireEvent.pointerDown(overlay!);
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
