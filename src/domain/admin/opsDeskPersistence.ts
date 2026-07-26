import {
  BUILTIN_PRESETS,
  CUSTOM_PRESET_ID,
  DEFAULT_COLS,
  DEFAULT_ROW_HEIGHT,
  SESSION_WATCH_LAYOUT,
  cloneLayout,
  isPanelId,
  type DeskLayout,
  type DeskPreset,
  type GridStack,
  type PanelId,
} from "./opsDeskLayout";

export const OPS_DESK_STORAGE_PREFIX = "jetlag.adminOpsDesk.v1";

export type OpsDeskStoreV1 = {
  version: 1;
  activePresetId: string;
  customLayout: DeskLayout;
  userPresets: DeskPreset[];
  lastMobilePanelId?: PanelId;
};

export function storageKey(uid: string | null): string {
  return uid ? `${OPS_DESK_STORAGE_PREFIX}:${uid}` : OPS_DESK_STORAGE_PREFIX;
}

export function defaultOpsDeskStore(): OpsDeskStoreV1 {
  return {
    version: 1,
    activePresetId: BUILTIN_PRESETS[0]!.id,
    customLayout: cloneLayout(SESSION_WATCH_LAYOUT),
    userPresets: [],
  };
}

function sanitizeStack(raw: unknown): GridStack | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== "string" || obj.id.length === 0) return null;

  const panelIds = Array.isArray(obj.panelIds)
    ? obj.panelIds.filter(isPanelId)
    : [];
  if (panelIds.length === 0) return null;

  const activeIndex =
    typeof obj.activeIndex === "number" && Number.isFinite(obj.activeIndex)
      ? Math.min(Math.max(0, Math.floor(obj.activeIndex)), panelIds.length - 1)
      : 0;

  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : fallback;

  return {
    id: obj.id,
    panelIds,
    activeIndex,
    x: Math.max(0, num(obj.x, 0)),
    y: Math.max(0, num(obj.y, 0)),
    w: Math.max(1, num(obj.w, 4)),
    h: Math.max(1, num(obj.h, 4)),
    pinned: obj.pinned === true ? true : undefined,
    collapsed: obj.collapsed === true ? true : undefined,
  };
}

export function sanitizeDeskLayout(raw: unknown): DeskLayout {
  if (!raw || typeof raw !== "object") {
    return cloneLayout(SESSION_WATCH_LAYOUT);
  }
  const obj = raw as Record<string, unknown>;
  const stacks = Array.isArray(obj.stacks)
    ? obj.stacks.map(sanitizeStack).filter((s): s is GridStack => s !== null)
    : [];

  const hiddenPanelIds = Array.isArray(obj.hiddenPanelIds)
    ? obj.hiddenPanelIds.filter(isPanelId)
    : [];

  if (stacks.length === 0) {
    return cloneLayout(SESSION_WATCH_LAYOUT);
  }

  const cols =
    typeof obj.cols === "number" && Number.isFinite(obj.cols) && obj.cols > 0
      ? Math.floor(obj.cols)
      : DEFAULT_COLS;
  const rowHeight =
    typeof obj.rowHeight === "number" &&
    Number.isFinite(obj.rowHeight) &&
    obj.rowHeight > 0
      ? Math.floor(obj.rowHeight)
      : DEFAULT_ROW_HEIGHT;

  return {
    cols,
    rowHeight,
    stacks,
    hiddenPanelIds,
  };
}

function sanitizeUserPreset(raw: unknown): DeskPreset | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== "string" || obj.id.length === 0) return null;
  if (typeof obj.name !== "string" || obj.name.trim().length === 0) return null;
  if (obj.kind !== "user") return null;
  return {
    id: obj.id,
    name: obj.name.trim(),
    kind: "user",
    layout: sanitizeDeskLayout(obj.layout),
  };
}

function sanitizeStore(raw: unknown): OpsDeskStoreV1 {
  const defaults = defaultOpsDeskStore();
  if (!raw || typeof raw !== "object") return defaults;

  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) return defaults;

  const customLayout = sanitizeDeskLayout(obj.customLayout);
  const userPresets = Array.isArray(obj.userPresets)
    ? obj.userPresets
        .map(sanitizeUserPreset)
        .filter((p): p is DeskPreset => p !== null)
    : [];

  let activePresetId =
    typeof obj.activePresetId === "string" && obj.activePresetId.length > 0
      ? obj.activePresetId
      : defaults.activePresetId;

  const knownIds = new Set<string>([
    CUSTOM_PRESET_ID,
    ...BUILTIN_PRESETS.map((p) => p.id),
    ...userPresets.map((p) => p.id),
  ]);
  if (!knownIds.has(activePresetId)) {
    activePresetId = defaults.activePresetId;
  }

  const lastMobilePanelId = isPanelId(obj.lastMobilePanelId)
    ? obj.lastMobilePanelId
    : undefined;

  return {
    version: 1,
    activePresetId,
    customLayout,
    userPresets,
    lastMobilePanelId,
  };
}

export function loadOpsDeskStore(uid: string | null): OpsDeskStoreV1 {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return defaultOpsDeskStore();
    return sanitizeStore(JSON.parse(raw) as unknown);
  } catch {
    return defaultOpsDeskStore();
  }
}

export function saveOpsDeskStore(
  uid: string | null,
  store: OpsDeskStoreV1,
): void {
  try {
    const sanitized = sanitizeStore(store);
    localStorage.setItem(storageKey(uid), JSON.stringify(sanitized));
  } catch {
    // private browsing / quota — never throw to UI
  }
}
