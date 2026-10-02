import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { MatchingCategoryPinMarker } from "./MatchingCategoryPinMarker";

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

describe("MatchingCategoryPinMarker", () => {
  it("renders the category glyph on the map pin", () => {
    render(
      <MatchingCategoryPinMarker
        latitude={53.35}
        longitude={-6.26}
        categoryId="commercial_airport"
        pulsing
      />,
    );

    const pin = screen.getByTestId("matching-category-pin");
    expect(pin).toHaveAttribute("data-category-id", "commercial_airport");
    expect(pin).toHaveAttribute("data-pulsing", "1");
    expect(screen.getByTestId("map-marker")).toHaveAttribute("data-lat", "53.35");
  });
});
