import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HidingZoneDraftCenterPin } from "./HidingZoneDraftCenterPin";

vi.mock("@/components/map/helpers/MapLibreGeoJsonOverlay", () => ({
  MapLibreGeoJsonOverlay: ({ id }: { id: string }) => <div data-testid={id} />,
}));

describe("HidingZoneDraftCenterPin", () => {
  it("renders the draft center pin when center is set", () => {
    render(<HidingZoneDraftCenterPin center={[51.5, -0.12]} />);

    expect(screen.getByTestId("hiding-zone-draft-center-pin")).toBeInTheDocument();
  });

  it("renders nothing when center is null", () => {
    const { container } = render(<HidingZoneDraftCenterPin center={null} />);

    expect(screen.queryByTestId("hiding-zone-draft-center-pin")).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });
});
