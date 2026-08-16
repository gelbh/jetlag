import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapScreenChromeBanners } from "./MapScreenChromeBanners";

vi.mock("../../../components/session/banners/FirestorePersistenceBanner", () => ({
  FirestorePersistenceBanner: () => <div>persistence-banner</div>,
}));

vi.mock("../../../components/ui/banners/AppUpdateMapChip", () => ({
  AppUpdateMapChip: () => <div>app-update-chip</div>,
}));

vi.mock("../../../components/ui/banners/MeasuringRefineMapChip", () => ({
  MeasuringRefineMapChip: ({ visible }: { visible: boolean }) =>
    visible ? <div>measuring-refine-chip</div> : null,
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
    expect(screen.queryByText("measuring-refine-chip")).not.toBeInTheDocument();
  });

  it("shows measuring refine chip when LOD is refining", () => {
    render(<MapScreenChromeBanners measuringLodRefining />);
    expect(screen.getByText("measuring-refine-chip")).toBeInTheDocument();
  });
});
