import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeocodedPlace } from "@/services/geo/geocoding";
import { jetlagTheme } from "@/theme/theme";
import { PlaceAreaSearchFields, PlaceAreaSearchInsetResults } from "./PlaceAreaSearchFields";

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

  it("renders unboxed inset result rows that still select a place", () => {
    const onSelectPlace = vi.fn();
    renderInset({ searchResults: [dublin], onSelectPlace });
    expect(document.querySelector(".border-2.border-border")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Dublin, Ireland/ }));
    expect(onSelectPlace).toHaveBeenCalledWith(dublin);
  });

  it("omits result rows when showResults is false", () => {
    renderInset({ searchResults: [dublin], showResults: false });
    expect(screen.queryByRole("button", { name: /Dublin, Ireland/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Find place" })).toBeInTheDocument();
  });

  it("skips the leading hairline when skipLeadingHairline is set", () => {
    const cork: GeocodedPlace = {
      id: "2",
      displayName: "Cork, Ireland",
      center: [51.9, -8.47],
      bounds: { south: 51.8, west: -8.6, north: 52.0, east: -8.3 },
      placeCategory: "city",
      approximateAreaSqMi: 30,
    };
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <PlaceAreaSearchInsetResults
          searchResults={[dublin, cork]}
          selectedPlaceId={null}
          onSelectPlace={() => undefined}
          skipLeadingHairline
        />
      </MantineProvider>,
    );
    const first = screen.getByRole("button", { name: /Dublin, Ireland/ });
    expect(first.previousElementSibling?.getAttribute("aria-hidden")).not.toBe("true");
    const second = screen.getByRole("button", { name: /Cork, Ireland/ });
    expect(second.previousElementSibling?.getAttribute("aria-hidden")).toBe("true");
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
