import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { TentaclePoiPinMarker } from "./TentaclePoiPinMarker";

vi.mock("react-map-gl/maplibre", () => ({
  Marker: ({
    children,
    latitude,
    longitude,
  }: {
    children: ReactNode;
    latitude: number;
    longitude: number;
  }) => (
    <div data-testid="map-marker" data-lat={latitude} data-lng={longitude}>
      {children}
    </div>
  ),
}));

describe("TentaclePoiPinMarker", () => {
  it("renders an unselected frosted place control with category glyph", () => {
    const onActivate = vi.fn();
    render(
      <TentaclePoiPinMarker
        latitude={53.35}
        longitude={-6.26}
        categoryId="museum"
        label="Irish Jewish Museum"
        onActivate={onActivate}
      />,
    );

    const pin = screen.getByTestId("tentacle-poi-pin");
    expect(pin).toHaveAttribute("data-category-id", "museum");
    expect(pin).not.toHaveAttribute("data-selected");
    fireEvent.click(pin);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("renders the selected pin state", () => {
    render(
      <TentaclePoiPinMarker
        latitude={53.35}
        longitude={-6.26}
        categoryId="library"
        selected
        dimmed={false}
        label="Chosen place"
        onActivate={() => undefined}
      />,
    );

    const pin = screen.getByTestId("tentacle-poi-pin");
    expect(pin).toHaveAttribute("data-selected", "1");
    expect(pin).toHaveAttribute("data-category-id", "library");
  });
});
