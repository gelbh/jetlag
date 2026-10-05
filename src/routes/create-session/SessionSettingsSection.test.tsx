import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { SessionSettingsSection } from "./SessionSettingsSection";

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => false,
}));

describe("SessionSettingsSection", () => {
  const props = {
    loading: false,
    verifyingAccess: false,
    previewGameArea: null,
    gameSize: "medium" as const,
    distanceUnit: "imperial" as const,
    onGameSizeChange: () => undefined,
    onDistanceUnitChange: () => undefined,
    resolvedSessionTier: "free" as const,
    visibleTierOptions: [],
    premiumEntitlements: null,
    onSessionTierChange: () => undefined,
    packCreditsLabel: null,
    packPremiumFlow: false,
  };

  it("puts Imperial Metric next to the size tiles, not a full-width control above a select", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <SessionSettingsSection {...props} />
      </MantineProvider>,
    );

    const units = screen.getByRole("group", { name: "Distance edition" });
    const sizes = screen.getByRole("radiogroup", { name: "Game size" });
    expect(units.compareDocumentPosition(sizes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Game size" })).not.toBeInTheDocument();
  });
});
