import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
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

function renderActivity(ui: ReactElement = <AppGlobalActivity />) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

afterEach(() => {
  resetAskMapPlacementStoreForTests();
  document.documentElement.removeAttribute("data-ask-map-placement");
  useSessionStore.setState({ pendingWrites: 0 });
});

describe("AppGlobalActivity", () => {
  it("anchors global load progress at the top, not the bottom dock", () => {
    const task = createLoadTask({ label: "Caching area boundaries", global: true });
    try {
      renderActivity();
      const list = screen.getByTestId("global-load-progress-list");
      const host = screen.getByTestId("app-global-status-host");
      expect(host).toContainElement(list);
      expect(host.className).toMatch(/\btop-0\b/);
      expect(host.className).not.toMatch(/\bbottom-0\b/);
    } finally {
      task.cancel();
    }
  });

  it("omits global load progress during map placement", () => {
    setAskMapPlacementActive(true);
    const task = createLoadTask({ label: "Loading map", global: true });

    try {
      renderActivity();

      expect(screen.queryByTestId("global-load-progress-list")).not.toBeInTheDocument();
    } finally {
      task.cancel();
    }
  });

  it("anchors Saving in the top status host, not the bottom dock", () => {
    useSessionStore.getState().incrementPendingWrites();

    renderActivity();

    const saving = screen.getByRole("status");
    expect(saving).toHaveTextContent("Saving…");

    const host = screen.getByTestId("app-global-status-host");
    expect(host).toContainElement(saving);
    expect(host.className).toMatch(/\btop-0\b/);
    expect(host.className).not.toMatch(/\bbottom-0\b/);
    expect(saving.closest(".bottom-0")).toBeNull();
  });
});
