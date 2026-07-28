import { describe, expect, it } from "vitest";
import {
  CUSTOM_PRESET_ID,
  DEFAULT_COLS,
  DEFAULT_ROW_HEIGHT,
  FORMER_BUILTIN_IDS,
  PANEL_IDS,
  cloneLayout,
  clampLayoutToCols,
  defaultScratchLayout,
  ensureIncidentPanelsVisible,
  hidePanel,
  layoutForFormerBuiltinId,
  mergePanelOntoStack,
  migrateLayoutToCols,
  setCollapsed,
  setPinned,
  showPanel,
  unstackPanelToCell,
  reorderPanelInStack,
  type DeskLayout,
  type GridStack,
} from "./opsDeskLayout";

function stack(
  partial: Partial<GridStack> & Pick<GridStack, "id" | "panelIds">,
): GridStack {
  return {
    activeIndex: 0,
    x: 0,
    y: 0,
    w: 4,
    h: 4,
    ...partial,
  };
}

function layoutOf(...stacks: GridStack[]): DeskLayout {
  return {
    cols: DEFAULT_COLS,
    rowHeight: DEFAULT_ROW_HEIGHT,
    stacks,
    hiddenPanelIds: [],
  };
}

describe("opsDeskLayout", () => {
  it("exposes six panel ids, Scratch id, and former builtin migrate ids only", () => {
    expect(PANEL_IDS).toEqual([
      "sessions",
      "monitor",
      "inbox",
      "detail",
      "actions",
      "settings",
    ]);
    expect(CUSTOM_PRESET_ID).toBe("custom");
    expect(FORMER_BUILTIN_IDS).toEqual([
      "session-watch",
      "incident-triage",
      "ops-overview",
    ]);
    const scratch = defaultScratchLayout();
    expect(scratch.cols).toBe(DEFAULT_COLS);
    expect(scratch.rowHeight).toBe(DEFAULT_ROW_HEIGHT);
    expect(scratch.stacks.map((s) => s.panelIds[0])).toEqual([
      "sessions",
      "monitor",
    ]);
    expect(layoutForFormerBuiltinId("session-watch")).toEqual(scratch);
    expect(layoutForFormerBuiltinId("not-a-builtin")).toBeNull();
  });

  it("cloneLayout preserves optional monitor field", () => {
    const layout = defaultScratchLayout();
    layout.monitor = { cols: 12, stacks: [] };
    const cloned = cloneLayout(layout);
    expect(cloned.monitor).toEqual({ cols: 12, stacks: [] });
    cloned.monitor = { cols: 8 };
    expect(layout.monitor).toEqual({ cols: 12, stacks: [] });
  });

  it("migrates 12-col layouts to 24 and clamps overflow", () => {
    const legacy: DeskLayout = {
      cols: 12,
      rowHeight: 36,
      stacks: [
        {
          id: "a",
          panelIds: ["sessions"],
          activeIndex: 0,
          x: 6,
          y: 0,
          w: 6,
          h: 4,
        },
      ],
      hiddenPanelIds: [],
    };

    const migrated = migrateLayoutToCols(legacy, 24);
    expect(migrated.cols).toBe(24);
    expect(migrated.rowHeight).toBe(DEFAULT_ROW_HEIGHT);
    expect(migrated.stacks[0]).toMatchObject({ x: 12, w: 12 });

    const overflow: DeskLayout = {
      cols: 24,
      rowHeight: 24,
      stacks: [
        {
          id: "b",
          panelIds: ["monitor"],
          activeIndex: 0,
          x: 20,
          y: 0,
          w: 10,
          h: 4,
        },
      ],
      hiddenPanelIds: [],
    };
    const clamped = clampLayoutToCols(overflow);
    expect(clamped.stacks[0]).toMatchObject({ x: 14, w: 10 });
    expect(clamped.stacks[0]!.x + clamped.stacks[0]!.w).toBe(24);
  });

  it("mergePanelOntoStack moves a panel into the target stack and removes empty source", () => {
    const layout = layoutOf(
      stack({ id: "a", panelIds: ["sessions"], x: 0, y: 0, w: 6, h: 6 }),
      stack({ id: "b", panelIds: ["inbox"], x: 6, y: 0, w: 6, h: 6 }),
    );

    const next = mergePanelOntoStack(layout, "a", "sessions", "b");

    expect(next.stacks).toHaveLength(1);
    expect(next.stacks[0]).toMatchObject({
      id: "b",
      panelIds: ["inbox", "sessions"],
      activeIndex: 1,
      x: 6,
      y: 0,
      w: 6,
      h: 6,
    });
    expect(next.hiddenPanelIds).toEqual([]);
  });

  it("mergePanelOntoStack keeps remaining panels on the source stack", () => {
    const layout = layoutOf(
      stack({
        id: "a",
        panelIds: ["sessions", "monitor"],
        activeIndex: 1,
        x: 0,
        y: 0,
        w: 4,
        h: 5,
      }),
      stack({ id: "b", panelIds: ["inbox"], x: 4, y: 0, w: 4, h: 5 }),
    );

    const next = mergePanelOntoStack(layout, "a", "monitor", "b");

    expect(next.stacks).toHaveLength(2);
    expect(next.stacks.find((s) => s.id === "a")).toMatchObject({
      panelIds: ["sessions"],
      activeIndex: 0,
    });
    expect(next.stacks.find((s) => s.id === "b")).toMatchObject({
      panelIds: ["inbox", "monitor"],
      activeIndex: 1,
    });
  });

  it("unstackPanelToCell pulls a tab into a new stack at the given cell", () => {
    const layout = layoutOf(
      stack({
        id: "a",
        panelIds: ["inbox", "detail"],
        activeIndex: 1,
        x: 0,
        y: 0,
        w: 6,
        h: 6,
      }),
    );

    const next = unstackPanelToCell(layout, "a", "detail", 6, 0, 6, 4);

    expect(next.stacks).toHaveLength(2);
    expect(next.stacks.find((s) => s.id === "a")).toMatchObject({
      panelIds: ["inbox"],
      activeIndex: 0,
    });
    const created = next.stacks.find((s) => s.id !== "a");
    expect(created).toMatchObject({
      panelIds: ["detail"],
      activeIndex: 0,
      x: 6,
      y: 0,
      w: 6,
      h: 4,
    });
  });

  it("reorderPanelInStack moves a middle tab to the front and follows activeIndex", () => {
    const layout = layoutOf(
      stack({
        id: "a",
        panelIds: ["inbox", "detail", "actions"],
        activeIndex: 1,
      }),
    );

    const next = reorderPanelInStack(layout, "a", 1, 0);

    expect(next.stacks[0]).toMatchObject({
      panelIds: ["detail", "inbox", "actions"],
      activeIndex: 0,
    });
  });

  it("reorderPanelInStack is a no-op for the same index", () => {
    const layout = layoutOf(
      stack({
        id: "a",
        panelIds: ["inbox", "detail"],
        activeIndex: 1,
      }),
    );

    expect(reorderPanelInStack(layout, "a", 1, 1)).toBe(layout);
  });

  it("reorderPanelInStack clamps out-of-bounds toIndex", () => {
    const layout = layoutOf(
      stack({
        id: "a",
        panelIds: ["inbox", "detail", "actions"],
        activeIndex: 0,
      }),
    );

    const next = reorderPanelInStack(layout, "a", 0, 99);

    expect(next.stacks[0]).toMatchObject({
      panelIds: ["detail", "actions", "inbox"],
      activeIndex: 2,
    });
  });

  it("ensureIncidentPanelsVisible unhides inbox/detail/actions when hidden", () => {
    const layout: DeskLayout = {
      cols: 12,
      rowHeight: 36,
      stacks: [
        stack({ id: "sessions", panelIds: ["sessions"], x: 0, y: 0, w: 12, h: 8 }),
      ],
      hiddenPanelIds: ["inbox", "detail", "actions", "monitor", "settings"],
    };

    const next = ensureIncidentPanelsVisible(layout);

    const visible = new Set(next.stacks.flatMap((s) => s.panelIds));
    expect(visible.has("inbox")).toBe(true);
    expect(visible.has("detail")).toBe(true);
    expect(visible.has("actions")).toBe(true);
    expect(next.hiddenPanelIds).not.toContain("inbox");
    expect(next.hiddenPanelIds).not.toContain("detail");
    expect(next.hiddenPanelIds).not.toContain("actions");
  });

  it("setPinned does not alter x/y/w/h", () => {
    const layout = layoutOf(
      stack({
        id: "a",
        panelIds: ["sessions"],
        x: 2,
        y: 3,
        w: 5,
        h: 7,
        pinned: false,
      }),
    );

    const next = setPinned(layout, "a", true);
    expect(next.stacks[0]).toMatchObject({
      id: "a",
      x: 2,
      y: 3,
      w: 5,
      h: 7,
      pinned: true,
    });
  });

  it("setCollapsed does not alter x/y/w", () => {
    const layout = layoutOf(
      stack({
        id: "a",
        panelIds: ["monitor"],
        x: 1,
        y: 2,
        w: 4,
        h: 6,
        collapsed: false,
      }),
    );

    const next = setCollapsed(layout, "a", true);
    expect(next.stacks[0]).toMatchObject({
      x: 1,
      y: 2,
      w: 4,
      h: 6,
      collapsed: true,
    });
  });

  it("hidePanel moves the panel into hiddenPanelIds and removes empty stacks", () => {
    const layout = layoutOf(
      stack({ id: "a", panelIds: ["sessions"], x: 0, y: 0, w: 6, h: 4 }),
      stack({ id: "b", panelIds: ["inbox"], x: 6, y: 0, w: 6, h: 4 }),
    );

    const next = hidePanel(layout, "sessions");

    expect(next.stacks.map((s) => s.id)).toEqual(["b"]);
    expect(next.hiddenPanelIds).toContain("sessions");
  });

  it("showPanel restores a hidden panel onto a new stack", () => {
    const layout: DeskLayout = {
      cols: 12,
      rowHeight: 36,
      stacks: [
        stack({ id: "a", panelIds: ["sessions"], x: 0, y: 0, w: 12, h: 6 }),
      ],
      hiddenPanelIds: ["settings"],
    };

    const next = showPanel(layout, "settings", { x: 0, y: 6, w: 4, h: 4 });

    expect(next.hiddenPanelIds).not.toContain("settings");
    expect(next.stacks.some((s) => s.panelIds.includes("settings"))).toBe(true);
  });

  it("cloneLayout deep-copies stacks and hidden ids", () => {
    const layout = layoutOf(
      stack({ id: "a", panelIds: ["sessions", "monitor"], activeIndex: 1 }),
    );
    layout.hiddenPanelIds = ["settings"];

    const cloned = cloneLayout(layout);
    cloned.stacks[0]!.panelIds.push("inbox");
    cloned.hiddenPanelIds.push("detail");

    expect(layout.stacks[0]!.panelIds).toEqual(["sessions", "monitor"]);
    expect(layout.hiddenPanelIds).toEqual(["settings"]);
  });
});
