import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminSessionsPage,
  type AdminSessionSummary,
} from "../../services/admin/adminSessions";

function mergeSessionsById(
  existing: readonly AdminSessionSummary[],
  incoming: readonly AdminSessionSummary[],
): AdminSessionSummary[] {
  const byId = new Map(existing.map((session) => [session.sessionId, session]));

  for (const session of incoming) {
    byId.set(session.sessionId, session);
  }

  return [...byId.values()];
}

export function useAdminSessionList(enabled: boolean) {
  const [sessions, setSessions] = useState<AdminSessionSummary[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

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
      const page = await fetchAdminSessionsPage(null);
      setSessions(page.sessions);
      setNextPageToken(page.nextPageToken);
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

  const loadMore = useCallback(async () => {
    if (!enabled || !nextPageToken || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const page = await fetchAdminSessionsPage(nextPageToken);
      setSessions((current) => mergeSessionsById(current, page.sessions));
      setNextPageToken(page.nextPageToken);
    } catch (loadMoreError) {
      setError(
        loadMoreError instanceof Error
          ? loadMoreError.message
          : "Couldn't load more sessions.",
      );
    } finally {
      setLoadingMore(false);
    }
  }, [enabled, loadingMore, nextPageToken]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    /* eslint-disable react-hooks/set-state-in-effect -- initial session list load */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [enabled, refresh]);

  return {
    sessions: enabled ? sessions : [],
    loading: enabled ? loading : false,
    refreshing: enabled ? refreshing : false,
    loadingMore: enabled ? loadingMore : false,
    hasMore: enabled ? nextPageToken != null : false,
    error: enabled ? error : null,
    lastFetchedAt: enabled ? lastFetchedAt : null,
    refresh,
    loadMore,
  };
}
