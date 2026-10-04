import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeocodedPlace } from "@/services/geo/geocoding";
import { jetlagTheme } from "@/theme/theme";
import { PlaceAreaSearchFields } from "./PlaceAreaSearchFields";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
});

const dublin: GeocodedPlace = {
  id: "1",
  displayName: "Dublin, Ireland",
  center: [53.35, -6.26],
  bounds: { south: 53.2, west: -6.5, north: 53.5, east: -6.0 },
  placeCategory: "city",
  approximateAreaSqMi: 45,
};

function renderInset(overrides: Partial<ComponentProps<typeof PlaceAreaSearchFields>> = {}) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <PlaceAreaSearchFields
        locationQuery=""
        onLocationQueryChange={() => undefined}
        onSearch={() => undefined}
        searchLoading={false}
        searchResults={[]}
        selectedPlaceId={null}
        selectedPlace={null}
        onSelectPlace={() => undefined}
        variant="inset"
        {...overrides}
      />
    </MantineProvider>,
  );
}

describe("PlaceAreaSearchFields inset", () => {
  it("uses a TextInput and Find place action, not a full-width secondary submit under a labeled field", () => {
    renderInset();
    expect(
      screen.getByRole("textbox", { name: /city, county, state, or country/i }),
    ).toBeInTheDocument();
    const find = screen.getByRole("button", { name: "Find place" });
    expect(find.closest("button")?.className ?? "").not.toMatch(/btn-secondary/);
  });

  it("renders result rows with the place name", () => {
    const onSelectPlace = vi.fn();
    renderInset({ searchResults: [dublin], onSelectPlace });
    fireEvent.click(screen.getByRole("button", { name: /Dublin, Ireland/ }));
    expect(onSelectPlace).toHaveBeenCalledWith(dublin);
  });

  it("calls onSearch from Find place click and Enter on the textbox", () => {
    const onSearch = vi.fn();
    renderInset({ onSearch });
    fireEvent.click(screen.getByRole("button", { name: "Find place" }));
    expect(onSearch).toHaveBeenCalledTimes(1);
    const textbox = screen.getByRole("textbox", { name: /city, county, state, or country/i });
    expect(textbox).toHaveAttribute("enterkeyhint", "search");
    expect(textbox).toHaveAttribute("inputmode", "search");
    fireEvent.keyDown(textbox, { key: "Enter" });
    expect(onSearch).toHaveBeenCalledTimes(2);
  });
});
