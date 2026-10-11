import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminMonitorFocus } from "../../../domain/admin/adminMonitorFocus";
import { AdminMonitorPlayerFocus } from "./AdminMonitorPlayerFocus";

const flyTo = vi.fn();
let locations: { uid: string; lat: number; lng: number }[] = [];

vi.mock("../../../components/map/helpers/useMapLibreMap", () => ({
  useMapLibreMap: () => ({ flyTo, getZoom: () => 10 }),
}));

vi.mock("../../../hooks/session/useSessionExtrasSync", () => ({
  usePlayerLocationsSync: () => locations,
}));

describe("AdminMonitorPlayerFocus", () => {
  beforeEach(() => {
    flyTo.mockReset();
    locations = [];
    useAdminMonitorFocus.setState({ focusedPlayerUid: null, focusRequest: 0 });
  });

  it("flies once per focus request, ignoring later location updates", () => {
    locations = [{ uid: "p1", lat: 1, lng: 2 }];
    const { rerender } = render(<AdminMonitorPlayerFocus />);

    act(() => useAdminMonitorFocus.getState().setFocusedPlayerUid("p1"));
    expect(flyTo).toHaveBeenCalledTimes(1);
    expect(flyTo).toHaveBeenCalledWith({ center: [2, 1], zoom: 14, duration: 500 });

    locations = [{ uid: "p1", lat: 3, lng: 4 }];
    rerender(<AdminMonitorPlayerFocus />);
    expect(flyTo).toHaveBeenCalledTimes(1);

    act(() => useAdminMonitorFocus.getState().setFocusedPlayerUid("p1"));
    expect(flyTo).toHaveBeenCalledTimes(2);
  });

  it("flies once when the location arrives after the focus request", () => {
    const { rerender } = render(<AdminMonitorPlayerFocus />);

    act(() => useAdminMonitorFocus.getState().setFocusedPlayerUid("p1"));
    expect(flyTo).not.toHaveBeenCalled();

    locations = [{ uid: "p1", lat: 1, lng: 2 }];
    rerender(<AdminMonitorPlayerFocus />);
    expect(flyTo).toHaveBeenCalledTimes(1);

    locations = [{ uid: "p1", lat: 3, lng: 4 }];
    rerender(<AdminMonitorPlayerFocus />);
    expect(flyTo).toHaveBeenCalledTimes(1);
  });
});
