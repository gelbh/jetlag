import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  resetAskMapPlacementStoreForTests,
  setAskMapPlacementActive,
} from "@/hooks/progress/askMapPlacementStore";
import { createLoadTask } from "@/services/core/progress/loadTask";
import { AppGlobalActivity } from "./AppGlobalActivity";

afterEach(() => {
  resetAskMapPlacementStoreForTests();
  document.documentElement.removeAttribute("data-ask-map-placement");
});

describe("AppGlobalActivity", () => {
  it("omits global load progress during map placement", () => {
    setAskMapPlacementActive(true);
    const task = createLoadTask({ label: "Loading map", global: true });

    try {
      render(<AppGlobalActivity />);

      expect(screen.queryByTestId("global-load-progress-list")).not.toBeInTheDocument();
    } finally {
      task.cancel();
    }
  });
});
