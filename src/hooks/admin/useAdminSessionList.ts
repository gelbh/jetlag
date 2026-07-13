import { useCallback, useEffect, useRef, useState } from "react";
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
  const requestGenerationRef = useRef(0);

  const refresh = useCallback(async (options?: { background?: boolean }) => {
    if (!enabled) {
      return;
    }

    const requestGeneration = ++requestGenerationRef.current;
    const background = options?.background === true;

    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const page = await fetchAdminSessionsPage(null);
      if (requestGeneration !== requestGenerationRef.current) {
        return;
      }

      setSessions(page.sessions);
      setNextPageToken(page.nextPageToken);
      setLastFetchedAt(new Date());
    } catch (refreshError) {
      if (requestGeneration !== requestGenerationRef.current) {
        return;
      }

      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Couldn't load live sessions.",
      );
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [enabled]);

  const loadMore = useCallback(async () => {
    if (!enabled || !nextPageToken || loadingMore) {
      return;
    }

    const requestGeneration = ++requestGenerationRef.current;
    const pageToken = nextPageToken;
    setLoadingMore(true);
    setError(null);

    try {
      const page = await fetchAdminSessionsPage(pageToken);
      if (requestGeneration !== requestGenerationRef.current) {
        return;
      }

      setSessions((current) => mergeSessionsById(current, page.sessions));
      setNextPageToken(page.nextPageToken);
    } catch (loadMoreError) {
      if (requestGeneration !== requestGenerationRef.current) {
        return;
      }

      setError(
        loadMoreError instanceof Error
          ? loadMoreError.message
          : "Couldn't load more sessions.",
      );
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        setLoadingMore(false);
      }
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
