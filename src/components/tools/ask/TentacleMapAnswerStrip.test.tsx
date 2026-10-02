import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TentaclePoi } from "@/domain/map/annotations";
import { jetlagTheme } from "@/theme/theme";
import { TentacleMapAnswerStrip } from "./TentacleMapAnswerStrip";

const pois: TentaclePoi[] = [
  {
    id: "poi-1",
    name: "Irish Jewish Museum",
    lat: 53.33,
    lng: -6.27,
    category: "museum",
  },
];

const baseProps = {
  categoryId: "museum" as const,
  distanceUnit: "metric" as const,
  searchRadiusMeters: 2000,
  poiOptions: pois,
  selectedPoiId: null as string | null,
  outOfReach: false,
  onOutOfReachChange: vi.fn(),
};

beforeEach(() => {
  baseProps.onOutOfReachChange = vi.fn();
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

describe("TentacleMapAnswerStrip", () => {
  it("prompts to tap the map when nothing is selected", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <TentacleMapAnswerStrip {...baseProps} />
      </MantineProvider>,
    );

    expect(screen.getByTestId("tentacle-map-answer-strip")).toBeInTheDocument();
    expect(screen.getByText(/Tap a place on the map/i)).toBeInTheDocument();
    expect(screen.queryByText("Irish Jewish Museum")).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: /Copy locations to send to hider/i,
      }),
    ).toBeNull();
  });

  it("shows copy-locations control only when solo seeker mode requests it", () => {
    const { rerender } = render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <TentacleMapAnswerStrip {...baseProps} showCopyForHider />
      </MantineProvider>,
    );

    expect(
      screen.getByRole("button", {
        name: /Copy locations to send to hider/i,
      }),
    ).toBeInTheDocument();

    rerender(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <TentacleMapAnswerStrip {...baseProps} showCopyForHider={false} />
      </MantineProvider>,
    );
    expect(
      screen.queryByRole("button", {
        name: /Copy locations to send to hider/i,
      }),
    ).toBeNull();
  });

  it("shows the selected place name and allows Not within reach", () => {
    const onOutOfReachChange = vi.fn();
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <TentacleMapAnswerStrip
          {...baseProps}
          selectedPoiId="poi-1"
          onOutOfReachChange={onOutOfReachChange}
          showCopyForHider
        />
      </MantineProvider>,
    );

    expect(screen.getByText("Irish Jewish Museum")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Copy locations to send to hider/i,
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Not within reach/i }));
    expect(onOutOfReachChange).toHaveBeenCalledWith(true);
  });
});
