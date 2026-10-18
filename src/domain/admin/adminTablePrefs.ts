export type AdminTableTab = "sessions" | "needs-you";
export type SortDir = "desc" | "asc";
export interface AdminTablePrefs {
  visible: string[];
  sort: { id: string; dir: SortDir } | null;
  density: "comfortable" | "compact";
}
export interface ColumnMeta {
  id: string;
  defaultVisible: boolean;
  pinned?: boolean;
}

export const prefsStorageKey = (tab: AdminTableTab) => `jl-admin-table:v1:${tab}`;

function withPinnedFirst(visible: string[], columns: readonly ColumnMeta[]): string[] {
  const pinned = columns.filter((c) => c.pinned).map((c) => c.id);
  return [...pinned, ...visible.filter((id) => !pinned.includes(id))];
}

export function defaultPrefs(
  columns: readonly ColumnMeta[],
  sort: AdminTablePrefs["sort"],
): AdminTablePrefs {
  return {
    visible: withPinnedFirst(
      columns.filter((c) => c.defaultVisible).map((c) => c.id),
      columns,
    ),
    sort,
    density: "comfortable",
  };
}

export function normalizePrefs(
  raw: unknown,
  columns: readonly ColumnMeta[],
  fallback: AdminTablePrefs,
): AdminTablePrefs {
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.visible) || (r.density !== "comfortable" && r.density !== "compact"))
    return fallback;
  const known = new Set(columns.map((c) => c.id));
  const visible = withPinnedFirst(
    [...new Set(r.visible.filter((id): id is string => typeof id === "string" && known.has(id)))],
    columns,
  );
  const s = r.sort as { id?: unknown; dir?: unknown } | null | undefined;
  const sortId = s?.id;
  const sortDir = s?.dir;
  const sort: AdminTablePrefs["sort"] =
    typeof sortId === "string" && known.has(sortId) && (sortDir === "asc" || sortDir === "desc")
      ? { id: sortId, dir: sortDir }
      : s === null
        ? null
        : fallback.sort;
  return { visible, sort, density: r.density };
}

export function readPrefs(
  tab: AdminTableTab,
  columns: readonly ColumnMeta[],
  fallback: AdminTablePrefs,
): AdminTablePrefs {
  try {
    const text = localStorage.getItem(prefsStorageKey(tab));
    return text ? normalizePrefs(JSON.parse(text), columns, fallback) : fallback;
  } catch {
    return fallback;
  }
}

export function writePrefs(tab: AdminTableTab, prefs: AdminTablePrefs): void {
  try {
    localStorage.setItem(prefsStorageKey(tab), JSON.stringify(prefs));
  } catch {
    // Storage blocked (private mode); preferences stay for this page only.
  }
}
