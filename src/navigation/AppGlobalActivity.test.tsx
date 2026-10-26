import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetAskMapPlacementStoreForTests,
  setAskMapPlacementActive,
} from "@/hooks/progress/askMapPlacementStore";
import { createLoadTask } from "@/services/core/progress/loadTask";
import { useSessionStore } from "@/state/sessionStore";
import { AppGlobalActivity } from "./AppGlobalActivity";

vi.mock("./useRouteTransition", () => ({
  useRouteTransition: () => ({ phase: "idle", loadingProgress: null }),
}));

function renderActivity(ui: ReactElement = <AppGlobalActivity />, initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <MantineProvider>{ui}</MantineProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  resetAskMapPlacementStoreForTests();
  document.documentElement.removeAttribute("data-ask-map-placement");
  useSessionStore.setState({ pendingWrites: 0 });
});

describe("AppGlobalActivity", () => {
  it("on /map clears the status rail with map-banner-top and stays centered", () => {
    const task = createLoadTask({ label: "Caching area boundaries", global: true });
    try {
      renderActivity(<AppGlobalActivity />, "/map");
      const list = screen.getByTestId("global-load-progress-list");
      const host = screen.getByTestId("app-global-status-host");
      expect(host).toContainElement(list);
      expect(host.className).toContain("--map-banner-top");
      expect(host.className).toMatch(/\bitems-center\b/);
      expect(host.className).not.toMatch(/\bbottom-0\b/);
    } finally {
      task.cancel();
    }
  });

  it("off /map keeps safe-area top host without map-banner-top", () => {
    const task = createLoadTask({ label: "Caching area boundaries", global: true });
    try {
      renderActivity(<AppGlobalActivity />, "/");
      const host = screen.getByTestId("app-global-status-host");
      expect(host.className).toMatch(/\btop-0\b/);
      expect(host.className).not.toContain("--map-banner-top");
      expect(host.className).toMatch(/\bitems-center\b/);
    } finally {
      task.cancel();
    }
  });

  it("omits global load progress during map placement", () => {
    setAskMapPlacementActive(true);
    const task = createLoadTask({ label: "Loading map", global: true });

    try {
      renderActivity(<AppGlobalActivity />, "/map");

      expect(screen.queryByTestId("global-load-progress-list")).not.toBeInTheDocument();
    } finally {
      task.cancel();
    }
  });

  it("on /map Saving uses the same under-rail host", () => {
    useSessionStore.getState().incrementPendingWrites();
    renderActivity(<AppGlobalActivity />, "/map");
    const host = screen.getByTestId("app-global-status-host");
    expect(host).toContainElement(screen.getByRole("status"));
    expect(host.className).toContain("--map-banner-top");
  });
});
