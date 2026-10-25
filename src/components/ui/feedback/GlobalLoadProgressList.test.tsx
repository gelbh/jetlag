import { MantineProvider } from "@mantine/core";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createLoadTask } from "@/services/core/progress/loadTask";
import { GlobalLoadProgressList } from "./GlobalLoadProgressList";

describe("GlobalLoadProgressList", () => {
  it("renders when a global task is running", () => {
    const task = createLoadTask({ label: "Loading map", global: true });

    try {
      render(
        <MantineProvider>
          <GlobalLoadProgressList />
        </MantineProvider>,
      );

      expect(screen.getByTestId("global-load-progress-list")).toBeInTheDocument();
    } finally {
      act(() => {
        task.cancel();
      });
    }
  });
});
