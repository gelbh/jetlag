import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapScreenChromeBanners, selectMapRefineChip } from "./MapScreenChromeBanners";

vi.mock("../../../components/session/banners/FirestorePersistenceBanner", () => ({
  FirestorePersistenceBanner: () => <div>persistence-banner</div>,
}));

vi.mock("../../../components/ui/banners/AppUpdateMapChip", () => ({
  AppUpdateMapChip: () => <div>app-update-chip</div>,
}));

vi.mock("../../../components/incident/HotfixGraceChip", () => ({
  HotfixGraceChip: () => <div>hotspot-chip</div>,
}));

describe("MapScreenChromeBanners", () => {
  it("renders the shared status-stack chips", () => {
    render(<MapScreenChromeBanners />);
    expect(screen.getByText("persistence-banner")).toBeInTheDocument();
    expect(screen.getByText("app-update-chip")).toBeInTheDocument();
    expect(screen.getByText("hotspot-chip")).toBeInTheDocument();
    expect(screen.queryByText("Refining measure")).not.toBeInTheDocument();
  });

  it("shows measuring refine copy when LOD is refining", () => {
    render(
      <MapScreenChromeBanners
        refineChip={{
          visible: true,
          title: "Refining measure",
          body: "Adding detail to the shaded area…",
        }}
      />,
    );
    expect(screen.getByText("Refining measure")).toBeInTheDocument();
    expect(
      screen.getByText("Adding detail to the shaded area…"),
    ).toBeInTheDocument();
  });

  it("shows loading-places copy when catalog is hydrating", () => {
    render(
      <MapScreenChromeBanners
        refineChip={{
          visible: true,
          title: "Loading places",
          body: "Adding remaining areas to the map…",
        }}
      />,
    );
    expect(screen.getByText("Loading places")).toBeTruthy();
  });
});

describe("selectMapRefineChip", () => {
  it("prefers catalog hydrate copy over shade refine", () => {
    const chip = selectMapRefineChip({
      catalogHydrating: true,
      measuringActiveAndRefining: true,
      shadeRefining: true,
    });
    expect(chip.visible).toBe(true);
    expect(chip.title).toBe("Loading places");
  });

  it("uses refining-shade copy for tentacle LOD", () => {
    const chip = selectMapRefineChip({
      catalogHydrating: false,
      measuringActiveAndRefining: false,
      shadeRefining: true,
    });
    expect(chip.visible).toBe(true);
    expect(chip.title).toBe("Refining shade");
  });
});
