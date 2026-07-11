import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GamePresetEditor, GamePresetList } from "./GamePresets";
import { renderWithRouter } from "../test/renderWithRouter";
import { useGamePresetStore } from "../state/gamePresetStore";
import { defaultAdvancedSessionSettings } from "../domain/session/advancedSessionSettings";
import { mergeBundledPresets, BUNDLED_GAME_PRESET_DEFINITIONS } from "../domain/regions/bundledGamePresets";

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
  it("renders bundled presets and new preset action", () => {
    useGamePresetStore.setState({ presets: mergeBundledPresets([]) });
    renderWithRouter(<GamePresetList />, { resetStores: false });

    expect(screen.getByRole("heading", { name: "Custom games" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New preset" })).toHaveAttribute(
      "href",
      "/presets/new",
    );
    expect(screen.getByRole("button", { name: /Europe/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText("County Dublin")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Europe/i }));
    expect(screen.getByRole("button", { name: /Ireland/i })).toBeInTheDocument();
  });

  it("lists saved presets with host and edit links", () => {
    useGamePresetStore.setState({
      presets: mergeBundledPresets([
        {
          id: "preset-1",
          name: "Weekly game",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          schemaVersion: 1,
          gameSize: "medium",
          distanceUnit: "metric",
          advancedSettings: defaultAdvancedSessionSettings("medium", "metric"),
          migrationStatus: "ok",
        },
      ]),
    });

    renderWithRouter(<GamePresetList />, { resetStores: false });

    expect(screen.getByText("Weekly game")).toBeInTheDocument();
    const weeklyCard = screen.getByText("Weekly game").closest("li");
    expect(weeklyCard).not.toBeNull();
    expect(
      within(weeklyCard as HTMLElement).getByRole("link", { name: "Host" }),
    ).toHaveAttribute("href", "/create?preset=preset-1");
    expect(
      within(weeklyCard as HTMLElement).getByRole("link", { name: "Edit" }),
    ).toHaveAttribute("href", "/presets/preset-1/edit");
  });

  it("renders a search field with an accessible label", () => {
    useGamePresetStore.setState({ presets: mergeBundledPresets([]) });
    renderWithRouter(<GamePresetList />, { resetStores: false });

    expect(screen.getByLabelText("Search presets")).toBeInTheDocument();
  });

  it("shows flat bundled results while searching and hides the tree", () => {
    useGamePresetStore.setState({ presets: mergeBundledPresets([]) });
    renderWithRouter(<GamePresetList />, { resetStores: false });

    fireEvent.change(screen.getByLabelText("Search presets"), {
      target: { value: "Fingal" },
    });

    expect(screen.getByText("Fingal County Council")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Host" }),
    ).toHaveAttribute("href", "/create?preset=bundled:dublin-fingal");
    expect(screen.queryByRole("button", { name: /Europe/i })).not.toBeInTheDocument();
  });

  it("filters user presets while searching", () => {
    useGamePresetStore.setState({
      presets: mergeBundledPresets([
        {
          id: "preset-1",
          name: "Weekly game",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          schemaVersion: 1,
          gameSize: "medium",
          distanceUnit: "metric",
          advancedSettings: defaultAdvancedSessionSettings("medium", "metric"),
          migrationStatus: "ok",
        },
      ]),
    });
    renderWithRouter(<GamePresetList />, { resetStores: false });

    fireEvent.change(screen.getByLabelText("Search presets"), {
      target: { value: "Weekly" },
    });

    expect(screen.getByText("Weekly game")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Europe/i })).not.toBeInTheDocument();
  });

  it("restores the browse tree after clearing search", () => {
    useGamePresetStore.setState({ presets: mergeBundledPresets([]) });
    renderWithRouter(<GamePresetList />, { resetStores: false });

    const searchInput = screen.getByLabelText("Search presets");
    fireEvent.change(searchInput, { target: { value: "Fingal" } });
    expect(screen.queryByRole("button", { name: /Europe/i })).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByRole("button", { name: /Europe/i })).toBeInTheDocument();
  });

  it("shows an empty state when search has no matches", () => {
    useGamePresetStore.setState({ presets: mergeBundledPresets([]) });
    renderWithRouter(<GamePresetList />, { resetStores: false });

    fireEvent.change(screen.getByLabelText("Search presets"), {
      target: { value: "Anchorage" },
    });

    expect(screen.getByText("No presets match your search.")).toBeInTheDocument();
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

    expect(useGamePresetStore.getState().presets).toHaveLength(
      BUNDLED_GAME_PRESET_DEFINITIONS.length + 1,
    );
    expect(
      useGamePresetStore
        .getState()
        .presets.find((preset) => preset.name === "Dublin medium")?.name,
    ).toBe("Dublin medium");
    expect(navigate).toHaveBeenCalledWith("/presets");
  });
});
