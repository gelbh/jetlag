import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeolocationReading } from "@/services/core/location/geolocation";
import { LiveUserLocationLayer } from "./LiveUserLocationLayer";

const useLiveLocationMock = vi.hoisted(() =>
  vi.fn((_enabled: boolean, _options?: unknown) => ({
    reading: null as GeolocationReading | null,
    error: null as string | null,
  })),
);

vi.mock("@/hooks/location/useLiveLocation", () => ({
  useLiveLocation: useLiveLocationMock,
}));

vi.mock("./UserLocationLayer", () => ({
  UserLocationLayer: ({ reading }: { reading: GeolocationReading | null }) => (
    <div data-testid="user-location-layer">{reading ? `${reading.lat},${reading.lng}` : "null"}</div>
  ),
}));

const sampleReading: GeolocationReading = {
  lat: 53.35,
  lng: -6.26,
  accuracy: 12,
  heading: null,
};

describe("LiveUserLocationLayer", () => {
  beforeEach(() => {
    useLiveLocationMock.mockReset();
    useLiveLocationMock.mockReturnValue({
      reading: null,
      error: null,
    });
  });

  it("does not call useLiveLocation when reading prop is provided", () => {
    render(<LiveUserLocationLayer enabled reading={sampleReading} />);

    expect(useLiveLocationMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("user-location-layer")).toHaveTextContent("53.35,-6.26");
  });

  it("starts useLiveLocation when reading prop is omitted", () => {
    useLiveLocationMock.mockReturnValue({
      reading: sampleReading,
      error: null,
    });

    render(<LiveUserLocationLayer enabled />);

    expect(useLiveLocationMock).toHaveBeenCalled();
    expect(useLiveLocationMock.mock.calls[0]?.[0]).toBe(true);
    expect(screen.getByTestId("user-location-layer")).toHaveTextContent("53.35,-6.26");
  });
});
