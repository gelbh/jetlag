import { describe, expect, it } from "vitest";
import {
  BUILTIN_PRESETS,
  CUSTOM_PRESET_ID,
  PANEL_IDS,
  cloneLayout,
  ensureIncidentPanelsVisible,
  hidePanel,
  mergePanelOntoStack,
  setCollapsed,
  setPinned,
  showPanel,
  unstackPanelToCell,
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
    cols: 12,
    rowHeight: 36,
    stacks,
    hiddenPanelIds: [],
  };
}

describe("opsDeskLayout", () => {
  it("exposes the six locked panel ids and three builtin presets", () => {
    expect(PANEL_IDS).toEqual([
      "sessions",
      "monitor",
      "inbox",
      "detail",
      "actions",
      "settings",
    ]);
    expect(CUSTOM_PRESET_ID).toBe("custom");
    expect(BUILTIN_PRESETS.map((p) => p.id)).toEqual([
      "session-watch",
      "incident-triage",
      "ops-overview",
    ]);
    for (const preset of BUILTIN_PRESETS) {
      expect(preset.kind).toBe("builtin");
      expect(preset.layout.cols).toBe(12);
    }
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
