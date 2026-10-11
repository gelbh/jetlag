import { describe, expect, it } from "vitest";
import {
  clampMonitorLayoutToCols,
  cloneMonitorLayout,
  DEFAULT_COLS,
  defaultMonitorLayout,
  hideMonitorPanel,
  type MonitorLayout,
  type MonitorStack,
  mergeMonitorPanelOntoStack,
  PANEL_IDS,
  reorderMonitorPanelInStack,
  showMonitorPanel,
  unstackMonitorPanelToCell,
} from "./opsDeskLayout";

function stack(
  partial: Partial<MonitorStack> & Pick<MonitorStack, "id" | "panelIds">,
): MonitorStack {
  return { activeIndex: 0, x: 0, y: 0, w: 6, h: 4, ...partial };
}

function layoutOf(...stacks: MonitorStack[]): MonitorLayout {
  return { cols: 24, rowHeight: 24, stacks, hiddenPanelIds: [] };
}

describe("opsDeskLayout", () => {
  it("exposes five panel ids", () => {
    expect(PANEL_IDS).toEqual(["sessions", "monitor", "inbox", "detail", "actions"]);
  });

  it("cloneMonitorLayout deep-clones stacks and hidden ids", () => {
    const layout = defaultMonitorLayout();
    const cloned = cloneMonitorLayout(layout);
    cloned.cols = 8;
    cloned.stacks[0]!.panelIds.push("chat");
    cloned.hiddenPanelIds.push("map");
    expect(layout).toEqual(defaultMonitorLayout());
  });

  it("defaultMonitorLayout shows map, roster, overview and log and hides the rest", () => {
    const monitor = defaultMonitorLayout();
    const visible = monitor.stacks.flatMap((s) => s.panelIds);
    expect(visible).toEqual(["map", "roster", "overview", "log"]);
    expect(monitor.hiddenPanelIds).toEqual(["chat", "sync", "mapTools", "mod"]);
    expect(monitor.cols).toBe(DEFAULT_COLS);
  });

  it("clampMonitorLayoutToCols pulls overflowing stacks back inside the grid", () => {
    const overflow: MonitorLayout = {
      cols: 24,
      rowHeight: 24,
      stacks: [{ id: "b", panelIds: ["map"], activeIndex: 0, x: 20, y: 0, w: 10, h: 4 }],
      hiddenPanelIds: [],
    };
    const clamped = clampMonitorLayoutToCols(overflow);
    expect(clamped.stacks[0]).toMatchObject({ x: 14, w: 10 });
    expect(clamped.stacks[0]!.x + clamped.stacks[0]!.w).toBe(24);
  });

  it("mergeMonitorPanelOntoStack moves a panel into the target stack and removes an empty source", () => {
    const layout = layoutOf(
      stack({ id: "a", panelIds: ["chat"], x: 0, w: 6 }),
      stack({ id: "b", panelIds: ["log"], x: 6, w: 6 }),
    );

    const next = mergeMonitorPanelOntoStack(layout, "a", "chat", "b");

    expect(next.stacks).toHaveLength(1);
    expect(next.stacks[0]).toMatchObject({
      id: "b",
      panelIds: ["log", "chat"],
      activeIndex: 1,
      x: 6,
      w: 6,
    });
  });

  it("mergeMonitorPanelOntoStack keeps remaining panels on the source stack", () => {
    const layout = layoutOf(
      stack({ id: "a", panelIds: ["overview", "sync"], activeIndex: 1 }),
      stack({ id: "b", panelIds: ["log"], x: 6 }),
    );

    const next = mergeMonitorPanelOntoStack(layout, "a", "sync", "b");

    expect(next.stacks.find((s) => s.id === "a")).toMatchObject({
      panelIds: ["overview"],
      activeIndex: 0,
    });
    expect(next.stacks.find((s) => s.id === "b")).toMatchObject({
      panelIds: ["log", "sync"],
      activeIndex: 1,
    });
  });

  it("unstackMonitorPanelToCell pulls a tab into a new stack at the given cell", () => {
    const layout = layoutOf(stack({ id: "a", panelIds: ["log", "chat"], activeIndex: 1 }));

    const next = unstackMonitorPanelToCell(layout, "a", "chat", 6, 0, 6, 4);

    expect(next.stacks.find((s) => s.id === "a")).toMatchObject({
      panelIds: ["log"],
      activeIndex: 0,
    });
    expect(next.stacks.find((s) => s.id !== "a")).toMatchObject({
      panelIds: ["chat"],
      activeIndex: 0,
      x: 6,
      y: 0,
      w: 6,
      h: 4,
    });
  });

  it("unstackMonitorPanelToCell moves a single-panel stack and clamps it inside the grid", () => {
    const layout = layoutOf(stack({ id: "a", panelIds: ["map"], collapsed: true }));

    const next = unstackMonitorPanelToCell(layout, "a", "map", 20, 2, 10, 5);

    expect(next.stacks).toHaveLength(1);
    expect(next.stacks[0]).toMatchObject({ id: "a", x: 14, y: 2, w: 10, h: 5, collapsed: false });
  });

  it("reorderMonitorPanelInStack moves a tab and keeps the active panel selected", () => {
    const layout = layoutOf(stack({ id: "a", panelIds: ["log", "chat", "sync"], activeIndex: 1 }));

    const next = reorderMonitorPanelInStack(layout, "a", 1, 0);

    expect(next.stacks[0]).toMatchObject({ panelIds: ["chat", "log", "sync"], activeIndex: 0 });
  });

  it("reorderMonitorPanelInStack returns the same layout for a no-op move", () => {
    const layout = layoutOf(stack({ id: "a", panelIds: ["log", "chat"], activeIndex: 1 }));

    expect(reorderMonitorPanelInStack(layout, "a", 1, 1)).toBe(layout);
    expect(reorderMonitorPanelInStack(layout, "a", 1, 99)).toBe(layout);
  });

  it("reorderMonitorPanelInStack clamps an out-of-bounds target index", () => {
    const layout = layoutOf(stack({ id: "a", panelIds: ["log", "chat", "sync"], activeIndex: 0 }));

    const next = reorderMonitorPanelInStack(layout, "a", 0, 99);

    expect(next.stacks[0]).toMatchObject({ panelIds: ["chat", "sync", "log"], activeIndex: 2 });
  });

  it("hideMonitorPanel hides the panel and removes the stack it emptied", () => {
    const layout = layoutOf(
      stack({ id: "a", panelIds: ["roster"] }),
      stack({ id: "b", panelIds: ["log"], x: 6 }),
    );

    const next = hideMonitorPanel(layout, "roster");

    expect(next.stacks.map((s) => s.id)).toEqual(["b"]);
    expect(next.hiddenPanelIds).toEqual(["roster"]);
  });

  it("showMonitorPanel restores a hidden panel onto a new stack at the placement", () => {
    const layout = {
      ...layoutOf(stack({ id: "a", panelIds: ["map"], w: 24, h: 6 })),
      hiddenPanelIds: ["chat" as const],
    };

    const next = showMonitorPanel(layout, "chat", { x: 0, y: 6, w: 8, h: 4 });

    expect(next.hiddenPanelIds).toEqual([]);
    expect(next.stacks.find((s) => s.panelIds.includes("chat"))).toMatchObject({
      x: 0,
      y: 6,
      w: 8,
      h: 4,
    });
  });

  it("showMonitorPanel stacks below the lowest panel when no placement is given", () => {
    const layout = {
      ...layoutOf(
        stack({ id: "a", panelIds: ["map"], y: 0, h: 6 }),
        stack({ id: "b", panelIds: ["log"], y: 6, h: 3 }),
      ),
      hiddenPanelIds: ["mod" as const],
    };

    const next = showMonitorPanel(layout, "mod");

    expect(next.stacks.find((s) => s.panelIds.includes("mod"))).toMatchObject({ x: 0, y: 9 });
  });
});
