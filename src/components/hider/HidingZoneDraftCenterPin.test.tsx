import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HidingZoneDraftCenterPin } from "./HidingZoneDraftCenterPin";

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
  it("renders the draft center pin when displayCenter is set", () => {
    render(<HidingZoneDraftCenterPin displayCenter={[51.5, -0.12]} />);

    expect(screen.getByTestId("hiding-zone-draft-center-pin")).toBeInTheDocument();
    expect(screen.getByTestId("hiding-zone-draft-center-pin")).toHaveAttribute("data-lat", "51.5");
    expect(screen.getByTestId("hiding-zone-draft-center-pin")).toHaveAttribute("data-lng", "-0.12");
  });

  it("renders nothing when displayCenter is null", () => {
    const { container } = render(<HidingZoneDraftCenterPin displayCenter={null} />);

    expect(screen.queryByTestId("hiding-zone-draft-center-pin")).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it("bumps radius while snapping and briefly when chosen", () => {
    const { rerender } = render(
      <HidingZoneDraftCenterPin displayCenter={[53.35, -6.26]} snapping chosenKey={null} />,
    );

    expect(screen.getByTestId("hiding-zone-draft-center-pin")).toHaveAttribute("data-radius", "10");

    rerender(
      <HidingZoneDraftCenterPin
        displayCenter={[53.3503, -6.2603]}
        snapping={false}
        chosenKey="station-1"
      />,
    );

    expect(screen.getByTestId("hiding-zone-draft-center-pin")).toHaveAttribute("data-radius", "12");
  });
});
