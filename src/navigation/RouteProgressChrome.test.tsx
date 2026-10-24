import { MantineProvider } from "@mantine/core";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLoadTask, setNamedLoadTask } from "@/services/core/progress/loadTask";
import { PACK_PLAY_AREA_TASK } from "@/services/core/progress/namedTasks";
import { RouteProgressChrome, routeProgressPercent } from "./RouteProgressChrome";

const routeTransition = vi.hoisted(() => ({
  phase: "settling",
  loadingProgress: {
    destinationTitle: "Map",
    steps: ["download-screen", "load-boundaries", "prepare-map"],
    currentStepIndex: 1,
    currentStepLabel: "Loading game boundaries…",
  },
}));

vi.mock("./useRouteTransition", () => ({
  useRouteTransition: () => routeTransition,
}));

describe("routeProgressPercent", () => {
  const progress = { steps: ["a", "b", "c", "d"], currentStepIndex: 1 } as never;

  it("credits a running step without a task", () => {
    expect(routeProgressPercent(progress, null)).toBe(34);
  });

  it("blends the current step's task percent into its share", () => {
    expect(routeProgressPercent(progress, 0)).toBe(25);
    expect(routeProgressPercent(progress, 50)).toBe(38);
    expect(routeProgressPercent(progress, 100)).toBe(50);
  });
});

describe("RouteProgressChrome", () => {
  afterEach(() => {
    setNamedLoadTask(PACK_PLAY_AREA_TASK, null);
  });

  it("drives the boundary step from the play area task", async () => {
    const task = createLoadTask({ label: "Loading game boundaries" });
    task.stage({ kind: "download", label: "Downloading", historyKey: "bundle:boundaries" });
    task.root.children[0]?.setCount(1, 2);
    // Snapshots refresh once per frame.
    await vi.waitFor(() => expect(task.getSnapshot().percent).toBe(50));
    act(() => {
      setNamedLoadTask(PACK_PLAY_AREA_TASK, task);
    });

    render(
      <MantineProvider>
        <RouteProgressChrome />
      </MantineProvider>,
    );

    const bar = screen.getByRole("progressbar", { name: "Opening Map" });
    // Step 2 of 3 at half done: (1 + 0.5) / 3.
    expect(bar).toHaveAttribute("aria-valuenow", "50");
  });
});
