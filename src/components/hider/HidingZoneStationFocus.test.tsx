import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOTION_MAP_CAMERA_SNAP_MS } from "@/domain/device/motion/motionTokens";
import { HidingZoneStationFocus } from "./HidingZoneStationFocus";

const map = vi.hoisted(() => ({ easeTo: vi.fn(), jumpTo: vi.fn() }));
const motion = vi.hoisted(() => ({ animate: true }));

vi.mock("@/components/map/helpers/useMapLibreMap", () => ({ useMapLibreMap: () => map }));
vi.mock("@/hooks/motion/useMotionProfile", () => ({ useMotionProfile: () => motion }));

const station = { id: "t2", name: "Terminal 2", lat: 35.55082, lng: 139.78827 };

describe("HidingZoneStationFocus", () => {
  beforeEach(() => {
    map.easeTo.mockReset();
    map.jumpTo.mockReset();
    motion.animate = true;
  });

  it("eases slowly to the selected station without changing zoom", () => {
    render(<HidingZoneStationFocus station={station} />);

    expect(map.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [139.78827, 35.55082],
        duration: MOTION_MAP_CAMERA_SNAP_MS,
      }),
    );
    expect(map.easeTo.mock.calls[0]?.[0]).not.toHaveProperty("zoom");
  });

  it("does not move again when the same station re-renders", () => {
    const { rerender } = render(<HidingZoneStationFocus station={station} />);
    rerender(<HidingZoneStationFocus station={{ ...station }} />);

    expect(map.easeTo).toHaveBeenCalledTimes(1);
  });

  it("eases again when a different station is picked", () => {
    const { rerender } = render(<HidingZoneStationFocus station={station} />);
    rerender(
      <HidingZoneStationFocus station={{ ...station, id: "t1", lat: 35.54916, lng: 139.78455 }} />,
    );

    expect(map.easeTo).toHaveBeenCalledTimes(2);
    expect(map.easeTo.mock.calls[1]?.[0]).toMatchObject({ center: [139.78455, 35.54916] });
  });

  it("jumps instead of animating under reduced motion", () => {
    motion.animate = false;
    render(<HidingZoneStationFocus station={station} />);

    expect(map.jumpTo).toHaveBeenCalledWith({ center: [139.78827, 35.55082] });
    expect(map.easeTo).not.toHaveBeenCalled();
  });

  it("stays put with no station", () => {
    render(<HidingZoneStationFocus station={null} />);

    expect(map.easeTo).not.toHaveBeenCalled();
    expect(map.jumpTo).not.toHaveBeenCalled();
  });
});
