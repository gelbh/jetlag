import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RouteTransitionProvider } from "../../../navigation/RouteTransitionContext";
import { jetlagTheme } from "../../../theme/theme";
import { AdminDeskTopbar } from "./AdminDeskTopbar";

function renderTopbar(overrides?: { onOpenSettings?: () => void }) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <MemoryRouter>
        <RouteTransitionProvider>
          <AdminDeskTopbar
            openIncidents={0}
            inQueue={0}
            now={new Date("2026-07-26T12:00:00.000Z")}
            onOpenSettings={overrides?.onOpenSettings ?? vi.fn()}
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

  it("links the Admin ops title back to /admin without Broadcast", () => {
    renderTopbar();

    const title = screen.getByRole("link", { name: /admin ops/i });
    expect(title.getAttribute("href")).toBe("/admin");
    expect(title.textContent).not.toMatch(/Broadcast/i);
  });

  it("links the open incidents stat to /admin/incidents", () => {
    renderTopbar();

    const link = screen.getByRole("link", { name: /open incidents/i });
    expect(link.getAttribute("href")).toBe("/admin/incidents");
    expect(link.textContent).toBe("0");
  });

  it("calls onOpenSettings when Settings is clicked", () => {
    const onOpenSettings = vi.fn();
    renderTopbar({ onOpenSettings });

    const settings = screen.getByRole("button", { name: /^settings$/i });
    expect(settings).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(settings);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
