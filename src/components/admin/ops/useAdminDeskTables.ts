import { useMemo, useState } from "react";
import {
  type AdminSessionChipFilters,
  applyAdminSessionChipFilters,
  filterAdminSessions,
} from "@/domain/admin/adminSessionFilters";
import {
  type AdminTablePrefs,
  type AdminTableTab,
  defaultPrefs,
  readPrefs,
  writePrefs,
} from "@/domain/admin/adminTablePrefs";
import type { IncidentRecord } from "@/domain/incident/incidentTypes";
import type { PreloadRequest } from "@/domain/preloadRequest/preloadRequestTypes";
import { useFreshnessClock } from "@/hooks/time/useFreshnessClock";
import type { AdminSessionPhase, AdminSessionSummary } from "@/services/admin/adminSessions";
import type { AdminColumn } from "../table/AdminDataTable";
import { buildNeedsYouColumns, NEEDS_YOU_DEFAULT_SORT } from "../table/needsYouColumns";
import { countOpenNeedsYou, type NeedsYouRow, toNeedsYouRows } from "../table/needsYouRows";
import { buildSessionColumns, SESSION_DEFAULT_SORT } from "../table/sessionColumns";

export type NeedsYouKind = "all" | "incident" | "preload";

const PRELOAD_ROUTE = "/admin/preload-requests";

const STATIC_SESSION_COLUMNS = buildSessionColumns(new Map());
const STATIC_NEEDS_COLUMNS = buildNeedsYouColumns();
const SESSION_DEFAULTS: AdminTablePrefs = {
  ...defaultPrefs(STATIC_SESSION_COLUMNS, SESSION_DEFAULT_SORT),
  density: "compact",
};
const NEEDS_DEFAULTS: AdminTablePrefs = {
  ...defaultPrefs(STATIC_NEEDS_COLUMNS, NEEDS_YOU_DEFAULT_SORT),
  density: "compact",
};

interface Inputs {
  sessions: readonly AdminSessionSummary[];
  incidents: readonly IncidentRecord[];
  preloadRequests: readonly PreloadRequest[];
  openIncidentsBySession: ReadonlyMap<string, number>;
  /** Current location; Kind follows preload table entry/exit only. */
  pathname: string;
  initialKind?: NeedsYouKind;
}

export function useAdminDeskTables({
  sessions,
  incidents,
  preloadRequests,
  openIncidentsBySession,
  pathname,
  initialKind = "all",
}: Inputs) {
  const nowMs = useFreshnessClock();
  const [query, setQuery] = useState("");
  const [liveOnly, setLiveOnly] = useState(true);
  const [phase, setPhase] = useState<AdminSessionPhase | null>(null);
  const [tier, setTier] = useState<AdminSessionSummary["tier"] | null>(null);
  const [hasIncident, setHasIncident] = useState(false);
  const [kind, setKind] = useState<NeedsYouKind>(initialKind);
  const [kindPath, setKindPath] = useState(pathname);
  const [showClosed, setShowClosed] = useState(false);

  // Kind follows preload table entry/exit only; incident detail must not reset it.
  // Adjust during render — avoids setState-in-effect (same pattern as map landscape chrome).
  if (pathname !== kindPath) {
    const previousPath = kindPath;
    setKindPath(pathname);
    if (pathname === PRELOAD_ROUTE) setKind("preload");
    else if (previousPath === PRELOAD_ROUTE) setKind("all");
  }
  const [sessionPrefs, setSessionPrefsState] = useState<AdminTablePrefs>(() =>
    readPrefs("sessions", STATIC_SESSION_COLUMNS, SESSION_DEFAULTS),
  );
  const [needsPrefs, setNeedsPrefsState] = useState<AdminTablePrefs>(() =>
    readPrefs("needs-you", STATIC_NEEDS_COLUMNS, NEEDS_DEFAULTS),
  );

  const sessionColumns = useMemo(
    () => buildSessionColumns(openIncidentsBySession),
    [openIncidentsBySession],
  );
  const needsColumns = STATIC_NEEDS_COLUMNS;

  const chips: AdminSessionChipFilters = { phase, tier, hasIncident };
  const sessionRows = applyAdminSessionChipFilters(
    filterAdminSessions(sessions, {
      query,
      liveOnly,
      annotatedOnly: false,
      mode: "all",
      state: null,
      sort: "lastActivity",
    }),
    chips,
    openIncidentsBySession,
  );

  const allNeedsRows = toNeedsYouRows(incidents, preloadRequests, { showClosed: true, nowMs });
  const needsOpenCount = countOpenNeedsYou(allNeedsRows);
  const needle = query.trim().toLowerCase();
  const needsRows: NeedsYouRow[] = allNeedsRows.filter(
    (row) =>
      (showClosed || row.open) &&
      (kind === "all" || row.kind === kind) &&
      (!needle ||
        row.summary.toLowerCase().includes(needle) ||
        (row.code ?? "").toLowerCase().includes(needle)),
  );

  const setSessionPrefs = (next: AdminTablePrefs) => {
    setSessionPrefsState(next);
    writePrefs("sessions", next);
  };
  const setNeedsPrefs = (next: AdminTablePrefs) => {
    setNeedsPrefsState(next);
    writePrefs("needs-you", next);
  };

  const prefsFor = (tab: AdminTableTab) => (tab === "sessions" ? sessionPrefs : needsPrefs);

  return {
    query,
    setQuery,
    liveOnly,
    setLiveOnly,
    phase,
    setPhase,
    tier,
    setTier,
    hasIncident,
    setHasIncident,
    kind,
    setKind,
    showClosed,
    setShowClosed,
    sessionColumns,
    needsColumns: needsColumns as AdminColumn<NeedsYouRow>[],
    sessionDefaults: SESSION_DEFAULTS,
    needsDefaults: NEEDS_DEFAULTS,
    sessionPrefs,
    needsPrefs,
    setSessionPrefs,
    setNeedsPrefs,
    prefsFor,
    sessionRows,
    needsRows,
    needsOpenCount,
    clearSearch: () => setQuery(""),
    clearChips: () => {
      setPhase(null);
      setTier(null);
      setHasIncident(false);
    },
    filtersActive: query.trim() !== "" || phase != null || tier != null || hasIncident,
  };
}

export type AdminDeskTables = ReturnType<typeof useAdminDeskTables>;
