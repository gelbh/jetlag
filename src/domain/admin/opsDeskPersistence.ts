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
  migrateLayoutToCols,
} from "./opsDeskLayout";

export const OPS_DESK_STORAGE_PREFIX = "jetlag.adminOpsDesk.v1";

export type OpsDeskStoreV1 = {
  version: 1;
  activePresetId: string;
  /** Cold-load target (builtin, custom, or user). */
  defaultPresetId: string;
  /** Chip order: builtins + custom + user ids. */
  presetOrder: string[];
  customLayout: DeskLayout;
  userPresets: DeskPreset[];
  lastMobilePanelId?: PanelId;
};

export function storageKey(uid: string | null): string {
  return uid ? `${OPS_DESK_STORAGE_PREFIX}:${uid}` : OPS_DESK_STORAGE_PREFIX;
}

function buildPresetOrder(userPresets: DeskPreset[]): string[] {
  return [
    ...BUILTIN_PRESETS.map((p) => p.id),
    CUSTOM_PRESET_ID,
    ...userPresets.map((p) => p.id),
  ];
}

function knownPresetIds(userPresets: DeskPreset[]): Set<string> {
  return new Set([
    CUSTOM_PRESET_ID,
    ...BUILTIN_PRESETS.map((p) => p.id),
    ...userPresets.map((p) => p.id),
  ]);
}

export function defaultOpsDeskStore(): OpsDeskStoreV1 {
  const defaultPresetId = BUILTIN_PRESETS[0]!.id;
  return {
    version: 1,
    activePresetId: defaultPresetId,
    defaultPresetId,
    presetOrder: buildPresetOrder([]),
    customLayout: cloneLayout(SESSION_WATCH_LAYOUT),
    userPresets: [],
  };
}

function sanitizeStack(raw: unknown): GridStack | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== "string" || obj.id.length === 0) return null;

  const panelIdsRaw = Array.isArray(obj.panelIds) ? obj.panelIds : [];
  const preferredActive =
    typeof obj.activeIndex === "number" && Number.isFinite(obj.activeIndex)
      ? panelIdsRaw[Math.floor(obj.activeIndex)]
      : undefined;
  const panelIds = panelIdsRaw.filter(isPanelId);
  if (panelIds.length === 0) return null;

  const preferredId =
    typeof preferredActive === "string" && isPanelId(preferredActive)
      ? preferredActive
      : null;
  const resolvedIndex = preferredId
    ? panelIds.indexOf(preferredId)
    : -1;
  const activeIndex = resolvedIndex >= 0 ? resolvedIndex : 0;

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

  const colsRaw =
    typeof obj.cols === "number" && Number.isFinite(obj.cols)
      ? Math.floor(obj.cols)
      : DEFAULT_COLS;
  const cols = colsRaw > 0 ? colsRaw : DEFAULT_COLS;
  const rowHeightRaw =
    typeof obj.rowHeight === "number" && Number.isFinite(obj.rowHeight)
      ? Math.floor(obj.rowHeight)
      : DEFAULT_ROW_HEIGHT;
  const rowHeight = rowHeightRaw > 0 ? rowHeightRaw : DEFAULT_ROW_HEIGHT;

  return migrateLayoutToCols(
    {
      cols,
      rowHeight,
      stacks,
      hiddenPanelIds,
    },
    DEFAULT_COLS,
  );
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

function sanitizePresetOrder(
  raw: unknown,
  userPresets: DeskPreset[],
): string[] {
  const known = knownPresetIds(userPresets);
  const fallback = buildPresetOrder(userPresets);
  if (!Array.isArray(raw)) return fallback;

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const id of raw) {
    if (typeof id !== "string" || !known.has(id) || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  for (const id of fallback) {
    if (!seen.has(id)) ordered.push(id);
  }
  return ordered;
}

function sanitizeStore(raw: unknown): OpsDeskStoreV1 {
  const defaults = defaultOpsDeskStore();
  if (!raw || typeof raw !== "object") return defaults;

  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) return defaults;

  const customLayout = sanitizeDeskLayout(obj.customLayout);
  const reservedIds = new Set<string>([
    CUSTOM_PRESET_ID,
    ...BUILTIN_PRESETS.map((p) => p.id),
  ]);
  const seenUserIds = new Set<string>();
  const userPresets = Array.isArray(obj.userPresets)
    ? obj.userPresets
        .map(sanitizeUserPreset)
        .filter((p): p is DeskPreset => {
          if (p === null) return false;
          if (reservedIds.has(p.id) || seenUserIds.has(p.id)) return false;
          seenUserIds.add(p.id);
          return true;
        })
    : [];

  const knownIds = knownPresetIds(userPresets);

  let activePresetId =
    typeof obj.activePresetId === "string" && obj.activePresetId.length > 0
      ? obj.activePresetId
      : defaults.activePresetId;
  if (!knownIds.has(activePresetId)) {
    activePresetId = defaults.activePresetId;
  }

  let defaultPresetId =
    typeof obj.defaultPresetId === "string" && obj.defaultPresetId.length > 0
      ? obj.defaultPresetId
      : defaults.defaultPresetId;
  if (!knownIds.has(defaultPresetId)) {
    defaultPresetId = defaults.defaultPresetId;
  }

  const lastMobilePanelId = isPanelId(obj.lastMobilePanelId)
    ? obj.lastMobilePanelId
    : undefined;

  return {
    version: 1,
    activePresetId,
    defaultPresetId,
    presetOrder: sanitizePresetOrder(obj.presetOrder, userPresets),
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

/** Cold `/admin` start: open `defaultPresetId`, not last `activePresetId`. */
export function coldStartOpsDeskStore(uid: string | null): OpsDeskStoreV1 {
  const loaded = loadOpsDeskStore(uid);
  return { ...loaded, activePresetId: loaded.defaultPresetId };
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
