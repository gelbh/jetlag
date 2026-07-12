import { useCallback, useEffect, useState } from "react";
import {
  fetchActiveAdminSessions,
  type AdminSessionSummary,
} from "../../services/admin/adminSessions";

const POLL_INTERVAL_MS = 15_000;

export function useAdminSessionList(enabled: boolean) {
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
      setSessions([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      setLastFetchedAt(null);
      return;
    }

    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh({ background: true });
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, refresh]);

  return {
    sessions,
    loading,
    refreshing,
    error,
    lastFetchedAt,
    refresh,
  };
}
