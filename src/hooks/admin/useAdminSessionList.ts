import { useCallback, useEffect, useRef, useState } from "react";
import {
  readAdminSessionListCache,
  writeAdminSessionListCache,
} from "../../services/admin/adminSessionListCache";
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

function initialFromCache(enabled: boolean): {
  sessions: AdminSessionSummary[];
  nextPageToken: string | null;
  lastFetchedAt: Date | null;
  loading: boolean;
} {
  if (!enabled) {
    return {
      sessions: [],
      nextPageToken: null,
      lastFetchedAt: null,
      loading: false,
    };
  }
  const cached = readAdminSessionListCache();
  if (cached == null) {
    return {
      sessions: [],
      nextPageToken: null,
      lastFetchedAt: null,
      loading: true,
    };
  }
  return {
    sessions: cached.sessions,
    nextPageToken: cached.nextPageToken,
    lastFetchedAt: cached.lastFetchedAt,
    loading: false,
  };
}

type RefreshOptions = { background?: boolean };

export function useAdminSessionList(enabled: boolean) {
  const initial = initialFromCache(enabled);
  const [sessions, setSessions] = useState<AdminSessionSummary[]>(
    () => initial.sessions,
  );
  const [loading, setLoading] = useState(() => initial.loading);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(
    () => initial.lastFetchedAt,
  );
  const [nextPageToken, setNextPageToken] = useState<string | null>(
    () => initial.nextPageToken,
  );
  const [enabledState, setEnabledState] = useState(enabled);
  const requestGenerationRef = useRef(0);
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);
  const trailingRefreshOptionsRef = useRef<RefreshOptions | null>(null);
  const lastFetchedAtRef = useRef<Date | null>(initial.lastFetchedAt);

  useEffect(() => {
    lastFetchedAtRef.current = lastFetchedAt;
  }, [lastFetchedAt]);

  if (enabled !== enabledState) {
    setEnabledState(enabled);
    if (enabled) {
      const cached = readAdminSessionListCache();
      if (cached != null) {
        setSessions(cached.sessions);
        setNextPageToken(cached.nextPageToken);
        setLastFetchedAt(cached.lastFetchedAt);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError(null);
    }
  }

  const refresh = useCallback(async (options?: RefreshOptions) => {
    if (!enabled) {
      return;
    }

    if (inFlightRefreshRef.current) {
      trailingRefreshOptionsRef.current = options ?? {};
      await inFlightRefreshRef.current;
      return;
    }

    let currentOptions = options;
    const run = (async () => {
      for (;;) {
        const requestGeneration = ++requestGenerationRef.current;
        const background = currentOptions?.background === true;

        setLoadingMore(false);

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

          const fetchedAt = new Date();
          setSessions(page.sessions);
          setNextPageToken(page.nextPageToken);
          setLastFetchedAt(fetchedAt);
          writeAdminSessionListCache({
            sessions: page.sessions,
            nextPageToken: page.nextPageToken,
            lastFetchedAt: fetchedAt,
          });
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

        const trailing = trailingRefreshOptionsRef.current;
        trailingRefreshOptionsRef.current = null;
        if (trailing == null) {
          break;
        }
        currentOptions = trailing;
      }
    })();

    inFlightRefreshRef.current = run;
    try {
      await run;
    } finally {
      if (inFlightRefreshRef.current === run) {
        inFlightRefreshRef.current = null;
      }
    }
  }, [enabled]);

  const loadMore = useCallback(async () => {
    if (!enabled || !nextPageToken || loadingMore) {
      return;
    }

    const requestGeneration = ++requestGenerationRef.current;
    const pageToken = nextPageToken;
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(true);
    setError(null);

    try {
      const page = await fetchAdminSessionsPage(pageToken);
      if (requestGeneration !== requestGenerationRef.current) {
        return;
      }

      setSessions((current) => {
        const merged = mergeSessionsById(current, page.sessions);
        writeAdminSessionListCache({
          sessions: merged,
          nextPageToken: page.nextPageToken,
          lastFetchedAt: lastFetchedAtRef.current ?? new Date(),
        });
        return merged;
      });
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
    const cached = readAdminSessionListCache();
    /* eslint-disable react-hooks/set-state-in-effect -- initial session list load */
    void refresh(cached != null ? { background: true } : undefined);
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
