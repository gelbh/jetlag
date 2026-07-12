import { useCallback, useEffect, useState } from "react";
import {
  fetchActiveAdminSessions,
  type AdminSessionSummary,
} from "../../services/admin/adminSessions";
import {
  useAdminPanelPreferences,
} from "../../domain/admin/adminPanelPreferences";

export function useAdminSessionList(enabled: boolean) {
  const pollIntervalMs = useAdminPanelPreferences(
    (state) => state.pollIntervalMs,
  );
  const [sessions, setSessions] = useState<AdminSessionSummary[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const refresh = useCallback(async (options?: { background?: boolean }) => {
    if (!enabled) {
      return;
    }

    const background = options?.background === true;
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const nextSessions = await fetchActiveAdminSessions();
      setSessions(nextSessions);
      setLastFetchedAt(new Date());
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Couldn't load live sessions.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    /* eslint-disable react-hooks/set-state-in-effect -- initial session list load */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */

    const intervalId = window.setInterval(() => {
      void refresh({ background: true });
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, pollIntervalMs, refresh]);

  return {
    sessions: enabled ? sessions : [],
    loading: enabled ? loading : false,
    refreshing: enabled ? refreshing : false,
    error: enabled ? error : null,
    lastFetchedAt: enabled ? lastFetchedAt : null,
    refresh,
  };
}
