import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingReadout } from "@/components/tools/shared/readout/LoadingReadout";
import { createLoadTask } from "@/services/core/progress/loadTask";
import { renderWithAppUi } from "@/test/renderWithAppUi";

const fetchSpec = {
  kind: "fetch" as const,
  label: "Searching map data",
  historyKey: "test:readout",
  expectedMs: 4_000,
};

describe("LoadingReadout with a task", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders label, stage, percent and a labelled progressbar", async () => {
    const task = createLoadTask({ label: "Finding nearest museum" });
    task.stage(fetchSpec).start();
    renderWithAppUi(<LoadingReadout task={task}>Finding nearest feature…</LoadingReadout>);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(screen.getByText("Finding nearest museum")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Searching map data");
    const bar = screen.getByRole("progressbar", { name: "Finding nearest museum" });
    expect(Number(bar.getAttribute("aria-valuenow"))).toBeGreaterThan(30);
    expect(bar.getAttribute("aria-valuetext")).toMatch(/percent/);
  });

  it("announces only stage changes in the live region", async () => {
    const task = createLoadTask({ label: "Finding nearest museum" });
    const stage = task.stage(fetchSpec);
    stage.start();
    renderWithAppUi(<LoadingReadout task={task}>x</LoadingReadout>);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    const before = screen.getByRole("status").textContent;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(screen.getByRole("status").textContent).toBe(before);
    stage.finish();
    task.stage({ ...fetchSpec, label: "Reading results" }).start();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(screen.getByRole("status").textContent).toContain("Reading results");
  });

  it("cancels the task from the Cancel button", async () => {
    const task = createLoadTask({ label: "Finding nearest museum" });
    task.stage(fetchSpec).start();
    renderWithAppUi(<LoadingReadout task={task}>x</LoadingReadout>);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(task.signal.aborted).toBe(true);
  });

  it("shows the overdue text instead of a number", async () => {
    const task = createLoadTask({ label: "Finding nearest museum" });
    task.stage(fetchSpec).start();
    renderWithAppUi(<LoadingReadout task={task}>x</LoadingReadout>);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7_000);
    });
    expect(screen.getByText(/Taking longer than usual/)).toBeTruthy();
  });

  it("keeps the spinner readout without a task", () => {
    renderWithAppUi(<LoadingReadout>Finding nearest feature…</LoadingReadout>);
    expect(screen.getByRole("status").textContent).toBe("Finding nearest feature…");
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
