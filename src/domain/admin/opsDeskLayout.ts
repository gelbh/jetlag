export const PANEL_IDS = ["sessions", "monitor", "inbox", "detail", "actions"] as const;

export type PanelId = (typeof PANEL_IDS)[number];

type StackId = string;

const MONITOR_PANEL_IDS = [
  "map",
  "roster",
  "overview",
  "log",
  "chat",
  "sync",
  "mapTools",
  "mod",
] as const;

export type MonitorPanelId = (typeof MONITOR_PANEL_IDS)[number];

export type MonitorStack = {
  id: StackId;
  panelIds: MonitorPanelId[];
  activeIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  pinned?: boolean;
  collapsed?: boolean;
};

export type MonitorLayout = {
  cols: number;
  rowHeight: number;
  stacks: MonitorStack[];
  hiddenPanelIds: MonitorPanelId[];
};

export const DEFAULT_COLS = 24;
const DEFAULT_ROW_HEIGHT = 24;

export function cloneMonitorLayout(layout: MonitorLayout): MonitorLayout {
  return {
    cols: layout.cols,
    rowHeight: layout.rowHeight,
    stacks: layout.stacks.map((stack) => ({
      ...stack,
      panelIds: [...stack.panelIds],
    })),
    hiddenPanelIds: [...layout.hiddenPanelIds],
  };
}

export function defaultMonitorLayout(): MonitorLayout {
  return {
    cols: DEFAULT_COLS,
    rowHeight: DEFAULT_ROW_HEIGHT,
    stacks: [
      {
        id: "monitor-map",
        panelIds: ["map"],
        activeIndex: 0,
        x: 0,
        y: 0,
        w: 14,
        h: 8,
      },
      {
        id: "monitor-roster",
        panelIds: ["roster"],
        activeIndex: 0,
        x: 0,
        y: 8,
        w: 14,
        h: 3,
      },
      {
        id: "monitor-overview",
        panelIds: ["overview"],
        activeIndex: 0,
        x: 14,
        y: 0,
        w: 10,
        h: 5,
      },
      {
        id: "monitor-log",
        panelIds: ["log"],
        activeIndex: 0,
        x: 14,
        y: 5,
        w: 10,
        h: 4,
      },
    ],
    hiddenPanelIds: ["chat", "sync", "mapTools", "mod"],
  };
}

export function clampMonitorLayoutToCols(layout: MonitorLayout): MonitorLayout {
  const cols = layout.cols > 0 ? layout.cols : DEFAULT_COLS;
  const next = cloneMonitorLayout(layout);
  next.cols = cols;
  next.stacks = next.stacks.map((stack) => {
    const w = Math.max(1, Math.min(stack.w, cols));
    const x = Math.max(0, Math.min(stack.x, cols - w));
    return { ...stack, x, w };
  });
  return next;
}

function clampMonitorActiveIndex(stack: MonitorStack): MonitorStack {
  if (stack.panelIds.length === 0) return stack;
  const max = stack.panelIds.length - 1;
  const activeIndex = Math.min(Math.max(0, stack.activeIndex), max);
  return activeIndex === stack.activeIndex ? stack : { ...stack, activeIndex };
}

function newMonitorStackId(layout: MonitorLayout): StackId {
  let n = layout.stacks.length + 1;
  let id = `monitor-stack-${n}`;
  const used = new Set(layout.stacks.map((s) => s.id));
  while (used.has(id)) {
    n += 1;
    id = `monitor-stack-${n}`;
  }
  return id;
}

function findMonitorStack(
  layout: MonitorLayout,
  stackId: StackId,
): { index: number; stack: MonitorStack } | null {
  const index = layout.stacks.findIndex((s) => s.id === stackId);
  if (index < 0) return null;
  return { index, stack: layout.stacks[index]! };
}

function visibleMonitorPanelIds(layout: MonitorLayout): Set<MonitorPanelId> {
  return new Set(layout.stacks.flatMap((s) => s.panelIds));
}

export function mergeMonitorPanelOntoStack(
  layout: MonitorLayout,
  sourceStackId: StackId,
  panelId: MonitorPanelId,
  targetStackId: StackId,
): MonitorLayout {
  if (sourceStackId === targetStackId) return layout;

  const source = findMonitorStack(layout, sourceStackId);
  const target = findMonitorStack(layout, targetStackId);
  if (!source || !target) return layout;
  if (!source.stack.panelIds.includes(panelId)) return layout;
  if (target.stack.panelIds.includes(panelId)) return layout;

  const next = cloneMonitorLayout(layout);
  const src = next.stacks[source.index]!;
  const dst = next.stacks[target.index]!;

  src.panelIds = src.panelIds.filter((id) => id !== panelId);
  dst.panelIds = [...dst.panelIds, panelId];
  dst.activeIndex = dst.panelIds.length - 1;

  next.stacks[source.index] = clampMonitorActiveIndex(src);
  next.stacks[target.index] = clampMonitorActiveIndex(dst);

  if (next.stacks[source.index]!.panelIds.length === 0) {
    next.stacks.splice(source.index, 1);
  }

  return next;
}

export function reorderMonitorPanelInStack(
  layout: MonitorLayout,
  stackId: StackId,
  fromIndex: number,
  toIndex: number,
): MonitorLayout {
  const found = findMonitorStack(layout, stackId);
  if (!found) return layout;

  const { panelIds, activeIndex } = found.stack;
  const len = panelIds.length;
  if (len === 0) return layout;
  if (fromIndex === toIndex) return layout;
  if (fromIndex < 0 || fromIndex >= len) return layout;

  const clampedTo = Math.min(Math.max(0, toIndex), len - 1);
  if (fromIndex === clampedTo) return layout;

  const next = cloneMonitorLayout(layout);
  const stack = next.stacks[found.index]!;
  const ids = [...stack.panelIds];
  const [moved] = ids.splice(fromIndex, 1);
  if (moved === undefined) return layout;
  ids.splice(clampedTo, 0, moved);

  let nextActive = activeIndex;
  const activeId = stack.panelIds[activeIndex];
  if (activeId !== undefined) {
    const idx = ids.indexOf(activeId);
    nextActive = idx >= 0 ? idx : activeIndex;
  }

  next.stacks[found.index] = clampMonitorActiveIndex({
    ...stack,
    panelIds: ids,
    activeIndex: nextActive,
  });
  return next;
}

export function unstackMonitorPanelToCell(
  layout: MonitorLayout,
  stackId: StackId,
  panelId: MonitorPanelId,
  x: number,
  y: number,
  w: number,
  h: number,
): MonitorLayout {
  const found = findMonitorStack(layout, stackId);
  if (!found) return layout;
  if (!found.stack.panelIds.includes(panelId)) return layout;
  if (found.stack.panelIds.length === 1) {
    const next = cloneMonitorLayout(layout);
    const alone = next.stacks[found.index]!;
    next.stacks[found.index] = {
      ...alone,
      x,
      y,
      w,
      h,
      collapsed: false,
    };
    return clampMonitorLayoutToCols(next);
  }

  const next = cloneMonitorLayout(layout);
  const src = next.stacks[found.index]!;
  src.panelIds = src.panelIds.filter((id) => id !== panelId);
  next.stacks[found.index] = clampMonitorActiveIndex(src);

  next.stacks.push({
    id: newMonitorStackId(next),
    panelIds: [panelId],
    activeIndex: 0,
    x,
    y,
    w,
    h,
  });

  return clampMonitorLayoutToCols(next);
}

export function setMonitorPinned(
  layout: MonitorLayout,
  stackId: StackId,
  pinned: boolean,
): MonitorLayout {
  const found = findMonitorStack(layout, stackId);
  if (!found) return layout;
  const next = cloneMonitorLayout(layout);
  next.stacks[found.index] = { ...next.stacks[found.index]!, pinned };
  return next;
}

export function setMonitorCollapsed(
  layout: MonitorLayout,
  stackId: StackId,
  collapsed: boolean,
): MonitorLayout {
  const found = findMonitorStack(layout, stackId);
  if (!found) return layout;
  const next = cloneMonitorLayout(layout);
  next.stacks[found.index] = { ...next.stacks[found.index]!, collapsed };
  return next;
}

export function hideMonitorPanel(layout: MonitorLayout, panelId: MonitorPanelId): MonitorLayout {
  const next = cloneMonitorLayout(layout);
  const stackIndex = next.stacks.findIndex((s) => s.panelIds.includes(panelId));
  if (stackIndex < 0) {
    if (!next.hiddenPanelIds.includes(panelId)) {
      next.hiddenPanelIds.push(panelId);
    }
    return next;
  }

  const stack = next.stacks[stackIndex]!;
  stack.panelIds = stack.panelIds.filter((id) => id !== panelId);
  next.stacks[stackIndex] = clampMonitorActiveIndex(stack);
  if (next.stacks[stackIndex]!.panelIds.length === 0) {
    next.stacks.splice(stackIndex, 1);
  }

  if (!next.hiddenPanelIds.includes(panelId)) {
    next.hiddenPanelIds.push(panelId);
  }
  return next;
}

type MonitorShowPanelPlacement = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function showMonitorPanel(
  layout: MonitorLayout,
  panelId: MonitorPanelId,
  placement?: MonitorShowPanelPlacement,
): MonitorLayout {
  if (visibleMonitorPanelIds(layout).has(panelId)) {
    const next = cloneMonitorLayout(layout);
    next.hiddenPanelIds = next.hiddenPanelIds.filter((id) => id !== panelId);
    return next;
  }

  const next = cloneMonitorLayout(layout);
  next.hiddenPanelIds = next.hiddenPanelIds.filter((id) => id !== panelId);

  const cell = placement ?? {
    x: 0,
    y: next.stacks.reduce((max, s) => Math.max(max, s.y + s.h), 0),
    w: 8,
    h: 4,
  };

  next.stacks.push({
    id: newMonitorStackId(next),
    panelIds: [panelId],
    activeIndex: 0,
    x: cell.x,
    y: cell.y,
    w: cell.w,
    h: cell.h,
  });

  return clampMonitorLayoutToCols(next);
}

export function setMonitorStackActiveIndex(
  layout: MonitorLayout,
  stackId: StackId,
  activeIndex: number,
): MonitorLayout {
  const found = findMonitorStack(layout, stackId);
  if (!found) return layout;
  const next = cloneMonitorLayout(layout);
  next.stacks[found.index] = clampMonitorActiveIndex({
    ...next.stacks[found.index]!,
    activeIndex,
  });
  return next;
}

export function applyMonitorStackGeometry(
  layout: MonitorLayout,
  items: readonly StackGeometryItem[],
): MonitorLayout {
  const next = cloneMonitorLayout(layout);
  const byId = new Map(items.map((item) => [item.i, item]));
  next.stacks = next.stacks.map((stack) => {
    const item = byId.get(stack.id);
    if (!item || stack.pinned) return stack;
    return {
      ...stack,
      x: item.x,
      y: item.y,
      w: item.w,
      h: stack.collapsed ? stack.h : item.h,
    };
  });
  return next;
}

export function monitorLayoutsEqual(a: MonitorLayout, b: MonitorLayout): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export type StackGeometryItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export const MONITOR_PANEL_LABELS: Record<MonitorPanelId, string> = {
  map: "Map",
  roster: "Roster",
  overview: "Overview",
  log: "Log",
  chat: "Chat",
  sync: "Sync",
  mapTools: "Map tools",
  mod: "Mod",
};

export const PANEL_LABELS: Record<PanelId, string> = {
  sessions: "Sessions",
  monitor: "Monitor",
  inbox: "Inbox",
  detail: "Detail",
  actions: "Actions",
};
