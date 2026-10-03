import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RouteTransitionProvider } from "../../navigation/RouteTransitionContext";
import { jetlagTheme } from "../../theme/theme";
import { AdminDeskTopbar } from "./AdminDeskTopbar";

function renderTopbar() {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <MemoryRouter>
        <RouteTransitionProvider>
          <AdminDeskTopbar
            openIncidents={0}
            inQueue={0}
            now={new Date("2026-07-26T12:00:00.000Z")}
            activePresetId="custom"
            defaultPresetId="custom"
            presetOrder={["custom"]}
            userPresets={[]}
            onSelectPreset={vi.fn()}
            onSaveCurrent={vi.fn()}
            onDeleteUserPreset={vi.fn()}
            onSetDefault={vi.fn()}
            onReorderPresets={vi.fn()}
            onRenameUserPreset={vi.fn()}
            onOverwriteUserPreset={vi.fn()}
          />
        </RouteTransitionProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("AdminDeskTopbar", () => {
  it("exposes a Home link to /", () => {
    renderTopbar();

    const home = screen.getByRole("link", { name: /^home$/i });
    expect(home.getAttribute("href")).toBe("/");
  });
});
