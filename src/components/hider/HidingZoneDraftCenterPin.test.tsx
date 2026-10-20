import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HidingZoneDraftCenterPin } from "./HidingZoneDraftCenterPin";
import { HIDING_ZONE_PIN_TRAVEL_MS } from "./hidingZoneDraftPinTravel";

const motionProfile = vi.hoisted(() => ({
  animate: true,
}));

vi.mock("@/hooks/motion/useMotionProfile", () => ({
  useMotionProfile: () => motionProfile,
}));

vi.mock("@/components/map/helpers/MapLibreGeoJsonOverlay", () => ({
  MapLibreGeoJsonOverlay: ({
    id,
    data,
    circle,
  }: {
    id: string;
    data: { coordinates: [number, number] };
    circle: { radius: number };
  }) => (
    <div
      data-testid={id}
      data-lng={String(data.coordinates[0])}
      data-lat={String(data.coordinates[1])}
      data-radius={String(circle.radius)}
    />
  ),
}));

describe("HidingZoneDraftCenterPin", () => {
  beforeEach(() => {
    motionProfile.animate = true;
    vi.useFakeTimers({ toFake: ["performance", "requestAnimationFrame"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the draft center pin when center is set", () => {
    render(<HidingZoneDraftCenterPin center={[51.5, -0.12]} />);

    expect(screen.getByTestId("hiding-zone-draft-center-pin")).toBeInTheDocument();
  });

  it("renders nothing when center is null", () => {
    const { container } = render(<HidingZoneDraftCenterPin center={null} />);

    expect(screen.queryByTestId("hiding-zone-draft-center-pin")).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it("jumps display to the new center when reduced motion", () => {
    motionProfile.animate = false;
    const { rerender } = render(<HidingZoneDraftCenterPin center={[53.35, -6.26]} />);

    rerender(<HidingZoneDraftCenterPin center={[53.3503, -6.2603]} />);

    const pin = screen.getByTestId("hiding-zone-draft-center-pin");
    expect(pin).toHaveAttribute("data-lat", "53.3503");
    expect(pin).toHaveAttribute("data-lng", "-6.2603");
  });

  it("tweens display from the previous center when animate is allowed", () => {
    const { rerender } = render(<HidingZoneDraftCenterPin center={[53.35, -6.26]} />);

    rerender(<HidingZoneDraftCenterPin center={[53.3503, -6.2603]} />);

    act(() => {
      vi.advanceTimersByTime(0);
    });

    const midPin = screen.getByTestId("hiding-zone-draft-center-pin");
    expect(Number(midPin.getAttribute("data-lat"))).toBeCloseTo(53.35, 4);

    act(() => {
      vi.advanceTimersByTime(HIDING_ZONE_PIN_TRAVEL_MS);
    });

    const settled = screen.getByTestId("hiding-zone-draft-center-pin");
    expect(settled).toHaveAttribute("data-lat", "53.3503");
    expect(settled).toHaveAttribute("data-lng", "-6.2603");
  });

  it("bumps radius while snapping and briefly when chosen", () => {
    const { rerender } = render(
      <HidingZoneDraftCenterPin center={[53.35, -6.26]} snapping chosenKey={null} />,
    );

    expect(screen.getByTestId("hiding-zone-draft-center-pin")).toHaveAttribute("data-radius", "10");

    rerender(
      <HidingZoneDraftCenterPin
        center={[53.3503, -6.2603]}
        snapping={false}
        chosenKey="station-1"
      />,
    );

    expect(screen.getByTestId("hiding-zone-draft-center-pin")).toHaveAttribute("data-radius", "12");
  });
});
