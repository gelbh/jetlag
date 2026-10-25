import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createLoadTask } from "@/services/core/progress/loadTask";
import { AppGlobalActivity } from "./AppGlobalActivity";

afterEach(() => {
  document.documentElement.removeAttribute("data-ask-map-placement");
});

describe("AppGlobalActivity", () => {
  it("omits global load progress during map placement", () => {
    document.documentElement.setAttribute("data-ask-map-placement", "1");
    const task = createLoadTask({ label: "Loading map", global: true });

    try {
      render(<AppGlobalActivity />);

      expect(screen.queryByTestId("global-load-progress-list")).not.toBeInTheDocument();
    } finally {
      task.cancel();
    }
  });
});
