import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PLAYER_ROUTE_VIEW_TRANSITION_CLASS,
  PlayerRouteViewTransition,
} from "./PlayerRouteViewTransition";

const viewTransitionProps = vi.hoisted(() => vi.fn());

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    ViewTransition: (props: Record<string, unknown>) => {
      viewTransitionProps(props);
      const { children } = props;
      return <div data-testid="player-route-vt">{children as ReactNode}</div>;
    },
  };
});

const useMotionProfileMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/motion/useMotionProfile", () => ({
  useMotionProfile: useMotionProfileMock,
}));

describe("PlayerRouteViewTransition", () => {
  beforeEach(() => {
    viewTransitionProps.mockClear();
    useMotionProfileMock.mockReturnValue({ decorativeAnimate: true });
  });

  it("uses jl-route-reveal transition classes when decorative motion is on (Verify #2)", () => {
    render(
      <PlayerRouteViewTransition>
        <span>outlet</span>
      </PlayerRouteViewTransition>,
    );

    expect(screen.getByText("outlet")).toBeInTheDocument();
    expect(viewTransitionProps).toHaveBeenCalledTimes(1);
    expect(viewTransitionProps.mock.calls[0]?.[0]).toMatchObject({
      default: "none",
      enter: PLAYER_ROUTE_VIEW_TRANSITION_CLASS,
      exit: PLAYER_ROUTE_VIEW_TRANSITION_CLASS,
      update: PLAYER_ROUTE_VIEW_TRANSITION_CLASS,
      share: "auto",
    });
  });

  it("disables all ViewTransition animations when decorative motion is off", () => {
    useMotionProfileMock.mockReturnValue({ decorativeAnimate: false });

    render(
      <PlayerRouteViewTransition>
        <span>outlet</span>
      </PlayerRouteViewTransition>,
    );

    expect(viewTransitionProps.mock.calls[0]?.[0]).toMatchObject({
      default: "none",
      enter: "none",
      exit: "none",
      update: "none",
      share: "none",
    });
  });
});
