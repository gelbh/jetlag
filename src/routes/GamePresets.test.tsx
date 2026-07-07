import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GamePresetEditor, GamePresetList } from "./GamePresets";
import { renderWithRouter } from "../test/renderWithRouter";
import { useGamePresetStore } from "../state/gamePresetStore";
import { defaultAdvancedSessionSettings } from "../domain/session/advancedSessionSettings";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("../components/map/MapView", () => ({
  MapView: () => <div data-testid="framing-map" />,
}));

vi.mock("../components/map/GameAreaMask", () => ({
  GameAreaMask: () => null,
}));

vi.mock("../components/map/FramingPreviewLayers", () => ({
  FramingPreviewLayers: () => null,
}));

const dublinPlace = {
  id: "dublin-ie",
  displayName: "Dublin, Ireland",
  bounds: { south: 53.2, west: -6.5, north: 53.5, east: -6.0 },
  center: [53.35, -6.25] as [number, number],
  category: "city" as const,
};

vi.mock("../services/geo/geocoding", () => ({
  searchPlaces: vi.fn(async () => [dublinPlace]),
}));

describe("GamePresetList", () => {
  it("renders empty state and new preset action", () => {
    useGamePresetStore.setState({ presets: [] });
    renderWithRouter(<GamePresetList />, { resetStores: false });

    expect(screen.getByRole("heading", { name: "Custom games" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New preset" })).toHaveAttribute(
      "href",
      "/presets/new",
    );
    expect(screen.getByText(/No presets saved on this device/i)).toBeInTheDocument();
  });

  it("lists saved presets with host and edit links", () => {
    useGamePresetStore.setState({
      presets: [
        {
          id: "preset-1",
          name: "Weekly game",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          schemaVersion: 1,
          gameSize: "medium",
          distanceUnit: "metric",
          advancedSettings: defaultAdvancedSessionSettings("medium", "metric"),
        },
      ],
    });

    renderWithRouter(<GamePresetList />, { resetStores: false });

    expect(screen.getByText("Weekly game")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Host" })).toHaveAttribute(
      "href",
      "/create?preset=preset-1",
    );
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/presets/preset-1/edit",
    );
  });
});

describe("GamePresetEditor", () => {
  it("shows frame game area control on the editor", () => {
    useGamePresetStore.setState({ presets: [] });
    renderWithRouter(<GamePresetEditor />, {
      route: "/presets/new",
      resetStores: false,
    });

    expect(
      screen.getByRole("button", { name: "Open fullscreen map" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Find place" }),
    ).toBeInTheDocument();
  });

  it("enables Done in the fullscreen map after searching for a place", async () => {
    useGamePresetStore.setState({ presets: [] });
    renderWithRouter(<GamePresetEditor />, {
      route: "/presets/new",
      resetStores: false,
    });

    fireEvent.change(
      screen.getByLabelText(/City, county, state, or country/i),
      { target: { value: "Dublin" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Find place" }));
    expect(await screen.findByText(/Suggested/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open fullscreen map" }));

    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();
  });

  it("creates a preset from the new editor form", () => {
    useGamePresetStore.setState({ presets: [] });
    renderWithRouter(<GamePresetEditor />, {
      route: "/presets/new",
      resetStores: false,
    });

    fireEvent.change(screen.getByLabelText(/Preset name/i), {
      target: { value: "Dublin medium" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save preset" }));

    expect(useGamePresetStore.getState().presets).toHaveLength(1);
    expect(useGamePresetStore.getState().presets[0]?.name).toBe("Dublin medium");
    expect(navigate).toHaveBeenCalledWith("/presets");
  });
});
