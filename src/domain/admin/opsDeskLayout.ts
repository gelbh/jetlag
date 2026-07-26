export const PANEL_IDS = [
  "sessions",
  "monitor",
  "inbox",
  "detail",
  "actions",
  "settings",
] as const;

export type PanelId = (typeof PANEL_IDS)[number];

export type StackId = string;

export type GridStack = {
  id: StackId;
  panelIds: PanelId[];
  activeIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  pinned?: boolean;
  collapsed?: boolean;
};

export type DeskLayout = {
  cols: number;
  rowHeight: number;
  stacks: GridStack[];
  hiddenPanelIds: PanelId[];
};

export type DeskPreset = {
  id: string;
  name: string;
  kind: "builtin" | "user";
  layout: DeskLayout;
};

export const CUSTOM_PRESET_ID = "custom";

export const DEFAULT_COLS = 24;
export const DEFAULT_ROW_HEIGHT = 24;

const INCIDENT_PANEL_IDS: readonly PanelId[] = ["inbox", "detail", "actions"];

export function isPanelId(value: unknown): value is PanelId {
  return typeof value === "string" && (PANEL_IDS as readonly string[]).includes(value);
}

export function cloneLayout(layout: DeskLayout): DeskLayout {
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

function clampActiveIndex(stack: GridStack): GridStack {
  if (stack.panelIds.length === 0) return stack;
  const max = stack.panelIds.length - 1;
  const activeIndex = Math.min(Math.max(0, stack.activeIndex), max);
  return activeIndex === stack.activeIndex ? stack : { ...stack, activeIndex };
}

function newStackId(layout: DeskLayout): StackId {
  let n = layout.stacks.length + 1;
  let id = `stack-${n}`;
  const used = new Set(layout.stacks.map((s) => s.id));
  while (used.has(id)) {
    n += 1;
    id = `stack-${n}`;
  }
  return id;
}

function findStack(
  layout: DeskLayout,
  stackId: StackId,
): { index: number; stack: GridStack } | null {
  const index = layout.stacks.findIndex((s) => s.id === stackId);
  if (index < 0) return null;
  return { index, stack: layout.stacks[index]! };
}

function visiblePanelIds(layout: DeskLayout): Set<PanelId> {
  return new Set(layout.stacks.flatMap((s) => s.panelIds));
}

export function mergePanelOntoStack(
  layout: DeskLayout,
  sourceStackId: StackId,
  panelId: PanelId,
  targetStackId: StackId,
): DeskLayout {
  if (sourceStackId === targetStackId) return layout;

  const source = findStack(layout, sourceStackId);
  const target = findStack(layout, targetStackId);
  if (!source || !target) return layout;
  if (!source.stack.panelIds.includes(panelId)) return layout;
  if (target.stack.panelIds.includes(panelId)) return layout;

  const next = cloneLayout(layout);
  const src = next.stacks[source.index]!;
  const dst = next.stacks[target.index]!;

  src.panelIds = src.panelIds.filter((id) => id !== panelId);
  dst.panelIds = [...dst.panelIds, panelId];
  dst.activeIndex = dst.panelIds.length - 1;

  next.stacks[source.index] = clampActiveIndex(src);
  next.stacks[target.index] = clampActiveIndex(dst);

  if (next.stacks[source.index]!.panelIds.length === 0) {
    next.stacks.splice(source.index, 1);
  }

  return next;
}

export function reorderPanelInStack(
  layout: DeskLayout,
  stackId: StackId,
  fromIndex: number,
  toIndex: number,
): DeskLayout {
  const found = findStack(layout, stackId);
  if (!found) return layout;

  const { panelIds, activeIndex } = found.stack;
  const len = panelIds.length;
  if (len === 0) return layout;
  if (fromIndex === toIndex) return layout;
  if (fromIndex < 0 || fromIndex >= len) return layout;

  const clampedTo = Math.min(Math.max(0, toIndex), len - 1);
  if (fromIndex === clampedTo) return layout;

  const next = cloneLayout(layout);
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

  next.stacks[found.index] = clampActiveIndex({
    ...stack,
    panelIds: ids,
    activeIndex: nextActive,
  });
  return next;
}

export function unstackPanelToCell(
  layout: DeskLayout,
  stackId: StackId,
  panelId: PanelId,
  x: number,
  y: number,
  w: number,
  h: number,
): DeskLayout {
  const found = findStack(layout, stackId);
  if (!found) return layout;
  if (!found.stack.panelIds.includes(panelId)) return layout;
  if (found.stack.panelIds.length === 1) {
    // Already alone — just move the stack geometry.
    const next = cloneLayout(layout);
    const alone = next.stacks[found.index]!;
    next.stacks[found.index] = {
      ...alone,
      x,
      y,
      w,
      h,
      collapsed: false,
    };
    return clampLayoutToCols(next);
  }

  const next = cloneLayout(layout);
  const src = next.stacks[found.index]!;
  src.panelIds = src.panelIds.filter((id) => id !== panelId);
  next.stacks[found.index] = clampActiveIndex(src);

  next.stacks.push({
    id: newStackId(next),
    panelIds: [panelId],
    activeIndex: 0,
    x,
    y,
    w,
    h,
  });

  return clampLayoutToCols(next);
}

export function setPinned(
  layout: DeskLayout,
  stackId: StackId,
  pinned: boolean,
): DeskLayout {
  const found = findStack(layout, stackId);
  if (!found) return layout;
  const next = cloneLayout(layout);
  next.stacks[found.index] = { ...next.stacks[found.index]!, pinned };
  return next;
}

export function setCollapsed(
  layout: DeskLayout,
  stackId: StackId,
  collapsed: boolean,
): DeskLayout {
  const found = findStack(layout, stackId);
  if (!found) return layout;
  const next = cloneLayout(layout);
  next.stacks[found.index] = { ...next.stacks[found.index]!, collapsed };
  return next;
}

export function hidePanel(layout: DeskLayout, panelId: PanelId): DeskLayout {
  const next = cloneLayout(layout);
  const stackIndex = next.stacks.findIndex((s) => s.panelIds.includes(panelId));
  if (stackIndex < 0) {
    if (!next.hiddenPanelIds.includes(panelId)) {
      next.hiddenPanelIds.push(panelId);
    }
    return next;
  }

  const stack = next.stacks[stackIndex]!;
  stack.panelIds = stack.panelIds.filter((id) => id !== panelId);
  next.stacks[stackIndex] = clampActiveIndex(stack);
  if (next.stacks[stackIndex]!.panelIds.length === 0) {
    next.stacks.splice(stackIndex, 1);
  }

  if (!next.hiddenPanelIds.includes(panelId)) {
    next.hiddenPanelIds.push(panelId);
  }
  return next;
}

export type ShowPanelPlacement = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function showPanel(
  layout: DeskLayout,
  panelId: PanelId,
  placement?: ShowPanelPlacement,
): DeskLayout {
  if (visiblePanelIds(layout).has(panelId)) {
    const next = cloneLayout(layout);
    next.hiddenPanelIds = next.hiddenPanelIds.filter((id) => id !== panelId);
    return next;
  }

  const next = cloneLayout(layout);
  next.hiddenPanelIds = next.hiddenPanelIds.filter((id) => id !== panelId);

  const cell = placement ?? {
    x: 0,
    y: next.stacks.reduce((max, s) => Math.max(max, s.y + s.h), 0),
    w: 8,
    h: 4,
  };

  next.stacks.push({
    id: newStackId(next),
    panelIds: [panelId],
    activeIndex: 0,
    x: cell.x,
    y: cell.y,
    w: cell.w,
    h: cell.h,
  });

  return clampLayoutToCols(next);
}

/**
 * Ensure inbox/detail/actions are on the grid for deep links.
 * Does not rewrite named/builtin presets — caller flips activePresetId to Custom.
 */
export function ensureIncidentPanelsVisible(layout: DeskLayout): DeskLayout {
  let next = cloneLayout(layout);
  const visible = visiblePanelIds(next);
  const missing = INCIDENT_PANEL_IDS.filter((id) => !visible.has(id));
  if (missing.length === 0) return next;

  // Classic triage strip along the bottom (or empty grid).
  const baseY = next.stacks.reduce((max, s) => Math.max(max, s.y + s.h), 0);
  const widths: Record<PanelId, number> = {
    sessions: 8,
    monitor: 8,
    inbox: 8,
    detail: 8,
    actions: 8,
    settings: 8,
  };
  let x = 0;
  for (const panelId of missing) {
    const w = widths[panelId];
    next = showPanel(next, panelId, { x, y: baseY, w, h: 5 });
    x += w;
    if (x >= next.cols) x = 0;
  }
  return next;
}

function makeStack(
  id: StackId,
  panelId: PanelId,
  x: number,
  y: number,
  w: number,
  h: number,
): GridStack {
  return {
    id,
    panelIds: [panelId],
    activeIndex: 0,
    x,
    y,
    w,
    h,
  };
}

function layoutFromVisible(
  stacks: GridStack[],
  hidden: PanelId[] = [],
): DeskLayout {
  return {
    cols: DEFAULT_COLS,
    rowHeight: DEFAULT_ROW_HEIGHT,
    stacks,
    hiddenPanelIds: hidden,
  };
}

/** Session watch: sessions + monitor dominate; incident panels hidden. */
export const SESSION_WATCH_LAYOUT: DeskLayout = layoutFromVisible(
  [
    makeStack("sessions", "sessions", 0, 0, 14, 10),
    makeStack("monitor", "monitor", 14, 0, 10, 10),
  ],
  ["inbox", "detail", "actions", "settings"],
);

/** Incident triage: classic three-pane; sessions/monitor/settings hidden. */
export const INCIDENT_TRIAGE_LAYOUT: DeskLayout = layoutFromVisible(
  [
    makeStack("inbox", "inbox", 0, 0, 6, 10),
    makeStack("detail", "detail", 6, 0, 10, 10),
    makeStack("actions", "actions", 16, 0, 8, 10),
  ],
  ["sessions", "monitor", "settings"],
);

/**
 * Ops overview: sessions + inbox left, detail center, actions + monitor right.
 * Settings stays hidden (open from menu).
 */
export const OPS_OVERVIEW_LAYOUT: DeskLayout = layoutFromVisible(
  [
    makeStack("sessions", "sessions", 0, 0, 8, 5),
    makeStack("inbox", "inbox", 0, 5, 8, 5),
    makeStack("detail", "detail", 8, 0, 8, 10),
    makeStack("actions", "actions", 16, 0, 8, 5),
    makeStack("monitor", "monitor", 16, 5, 8, 5),
  ],
  ["settings"],
);

export const BUILTIN_PRESETS: DeskPreset[] = [
  {
    id: "session-watch",
    name: "Session watch",
    kind: "builtin",
    layout: SESSION_WATCH_LAYOUT,
  },
  {
    id: "incident-triage",
    name: "Incident triage",
    kind: "builtin",
    layout: INCIDENT_TRIAGE_LAYOUT,
  },
  {
    id: "ops-overview",
    name: "Ops overview",
    kind: "builtin",
    layout: OPS_OVERVIEW_LAYOUT,
  },
];

export function getBuiltinPreset(id: string): DeskPreset | undefined {
  return BUILTIN_PRESETS.find((p) => p.id === id);
}

export function presetLabel(id: string, userPresets: DeskPreset[]): string {
  if (id === CUSTOM_PRESET_ID) return "Custom";
  const builtin = getBuiltinPreset(id);
  if (builtin) return builtin.name;
  return userPresets.find((p) => p.id === id)?.name ?? id;
}

/** Move `id` by `delta` steps (−1 earlier, +1 later). Null if no-op. */
export function movePresetOrder(
  orderedIds: string[],
  id: string,
  delta: number,
): string[] | null {
  const index = orderedIds.indexOf(id);
  if (index < 0) return null;
  return movePresetToIndex(orderedIds, id, index + delta);
}

/** Move `id` to `toIndex`. Null if no-op or out of range. */
export function movePresetToIndex(
  orderedIds: string[],
  id: string,
  toIndex: number,
): string[] | null {
  const fromIndex = orderedIds.indexOf(id);
  if (fromIndex < 0) return null;
  if (toIndex < 0 || toIndex >= orderedIds.length) return null;
  if (fromIndex === toIndex) return null;
  const next = [...orderedIds];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return null;
  next.splice(toIndex, 0, item);
  return next;
}

export function defaultOpsDeskLayout(): DeskLayout {
  return cloneLayout(SESSION_WATCH_LAYOUT);
}

/** Pure helper for named preset save (reject empty; overwrite by id/name). */
export function upsertUserPreset(
  userPresets: DeskPreset[],
  name: string,
  layout: DeskLayout,
  options?: { overwriteId?: string },
): { ok: true; presets: DeskPreset[]; preset: DeskPreset } | { ok: false; reason: "empty-name" } {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, reason: "empty-name" };

  const id =
    options?.overwriteId ??
    `user-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "layout"}`;

  const preset: DeskPreset = {
    id,
    name: trimmed,
    kind: "user",
    layout: cloneLayout(layout),
  };

  const without = userPresets.filter((p) => p.id !== id && p.name !== trimmed);
  return { ok: true, presets: [...without, preset], preset };
}

export function deleteUserPreset(
  userPresets: DeskPreset[],
  presetId: string,
): DeskPreset[] {
  return userPresets.filter((p) => p.id !== presetId);
}

export function setStackActiveIndex(
  layout: DeskLayout,
  stackId: StackId,
  activeIndex: number,
): DeskLayout {
  const found = findStack(layout, stackId);
  if (!found) return layout;
  const next = cloneLayout(layout);
  next.stacks[found.index] = clampActiveIndex({
    ...next.stacks[found.index]!,
    activeIndex,
  });
  return next;
}

export type StackGeometryItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Apply RGL geometry; pinned stacks keep position/size; collapsed keeps domain h. */
export function applyStackGeometry(
  layout: DeskLayout,
  items: readonly StackGeometryItem[],
): DeskLayout {
  const next = cloneLayout(layout);
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

export function layoutsEqual(a: DeskLayout, b: DeskLayout): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Clamp every stack so `x + w ≤ cols` (and `w ≤ cols`, `x ≥ 0`). */
export function clampLayoutToCols(layout: DeskLayout): DeskLayout {
  const cols = layout.cols > 0 ? layout.cols : DEFAULT_COLS;
  const next = cloneLayout(layout);
  next.cols = cols;
  next.stacks = next.stacks.map((stack) => {
    const w = Math.max(1, Math.min(stack.w, cols));
    const x = Math.max(0, Math.min(stack.x, cols - w));
    if (x === stack.x && w === stack.w) return stack;
    return { ...stack, x, w };
  });
  return next;
}

/**
 * Scale stack `x`/`w` when migrating col counts (e.g. 12 → 24), then clamp.
 * Sets `cols` and `rowHeight` to the target / current defaults.
 */
export function migrateLayoutToCols(
  layout: DeskLayout,
  targetCols: number = DEFAULT_COLS,
): DeskLayout {
  const fromCols = layout.cols > 0 ? layout.cols : DEFAULT_COLS;
  const next = cloneLayout(layout);
  next.cols = targetCols;
  next.rowHeight =
    layout.rowHeight > 0 ? layout.rowHeight : DEFAULT_ROW_HEIGHT;
  if (fromCols !== targetCols) {
    next.rowHeight = DEFAULT_ROW_HEIGHT;
    const scale = targetCols / fromCols;
    next.stacks = next.stacks.map((stack) => ({
      ...stack,
      x: Math.round(stack.x * scale),
      w: Math.max(1, Math.round(stack.w * scale)),
    }));
  }
  return clampLayoutToCols(next);
}

export const PANEL_LABELS: Record<PanelId, string> = {
  sessions: "Sessions",
  monitor: "Monitor",
  inbox: "Inbox",
  detail: "Detail",
  actions: "Actions",
  settings: "Settings",
};

export function resolvePresetLayout(
  activePresetId: string,
  customLayout: DeskLayout,
  userPresets: DeskPreset[],
): DeskLayout {
  if (activePresetId === CUSTOM_PRESET_ID) {
    return cloneLayout(customLayout);
  }
  const builtin = getBuiltinPreset(activePresetId);
  if (builtin) return cloneLayout(builtin.layout);
  const user = userPresets.find((p) => p.id === activePresetId);
  if (user) return cloneLayout(user.layout);
  return cloneLayout(SESSION_WATCH_LAYOUT);
}
