import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLatestRequest } from "../../hooks/forms/useLatestRequest";
import { useDebouncedValue } from "../../hooks/forms/useDebouncedValue";
import { validateFriendSearchQuery } from "../../domain/game/playerProfile";
import { feedback } from "../../services/device/feedbackService";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  listFriends,
  removeFriend,
  requestFriend,
  searchFriends,
  type FriendListEntry,
} from "../../services/profile/profileFriends";

export type FriendRelation = "incoming" | "outgoing" | "friend" | "search";
export type FriendsListTab = "incoming" | "outgoing" | "friends";

export interface SelectableFriend extends FriendListEntry {
  relation: FriendRelation;
}

const LIVE_SEARCH_DEBOUNCE_MS = 350;
const SUCCESS_CLEAR_MS = 2500;

export function relationLabel(relation: FriendRelation): string {
  switch (relation) {
    case "incoming":
      return "Incoming request";
    case "outgoing":
      return "Outgoing request";
    case "friend":
      return "Friend";
    case "search":
      return "Search result";
    default: {
      const _exhaustive: never = relation;
      return _exhaustive;
    }
  }
}

export function useFriendsPanelModel() {
  const [query, setQuery] = useState("");
  const [queryError, setQueryError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<FriendListEntry[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [friends, setFriends] = useState<FriendListEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendListEntry[]>([]);
  const [outgoing, setOutgoing] = useState<FriendListEntry[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [listTab, setListTab] = useState<FriendsListTab>("friends");
  const cancelledRef = useRef(false);
  const { beginRequest, isLatestRequest } = useLatestRequest();
  const debouncedQuery = useDebouncedValue(query, LIVE_SEARCH_DEBOUNCE_MS);

  const refresh = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) {
      setLoadingList(true);
    }
    setError(null);
    try {
      const next = await listFriends();
      if (cancelledRef.current) {
        return;
      }
      setFriends(next.friends);
      setIncoming(next.incoming);
      setOutgoing(next.outgoing);
    } catch (nextError) {
      if (cancelledRef.current) {
        return;
      }
      setError(
        nextError instanceof Error ? nextError.message : "Could not load friends.",
      );
      void feedback("error");
    } finally {
      if (!cancelledRef.current) {
        setLoadingList(false);
      }
    }
  }, []);

  const pullRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }
    setRefreshing(true);
    try {
      await refresh({ soft: true });
      void feedback("selection");
    } finally {
      if (!cancelledRef.current) {
        setRefreshing(false);
      }
    }
  }, [refresh, refreshing]);

  useEffect(() => {
    cancelledRef.current = false;
    /* eslint-disable react-hooks/set-state-in-effect -- initial friends list load */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => {
      cancelledRef.current = true;
    };
  }, [refresh]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, SUCCESS_CLEAR_MS);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (queryError) {
      setQueryError(null);
    }
    if (value.trim() === "") {
      beginRequest();
      setHasSearched(false);
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const validated = validateFriendSearchQuery(value);
    if (!validated.ok) {
      beginRequest();
      setSearchResults([]);
      setHasSearched(false);
      setSearching(false);
    }
  };

  const runSearch = useCallback(
    async (raw: string, opts: { showFieldError: boolean }) => {
      const validated = validateFriendSearchQuery(raw);
      if (!validated.ok) {
        if (opts.showFieldError) {
          setQueryError(validated.error);
        }
        setSearchResults([]);
        setHasSearched(false);
        return;
      }
      setQueryError(null);
      const requestId = beginRequest();
      setSearching(true);
      setError(null);
      try {
        const next = await searchFriends(validated.normalized);
        if (!isLatestRequest(requestId) || cancelledRef.current) {
          return;
        }
        setSearchResults(next.results);
        setHasSearched(true);
      } catch (nextError) {
        if (!isLatestRequest(requestId) || cancelledRef.current) {
          return;
        }
        setSearchResults([]);
        setHasSearched(true);
        setError(
          nextError instanceof Error ? nextError.message : "Search failed.",
        );
        void feedback("error");
      } finally {
        if (isLatestRequest(requestId) && !cancelledRef.current) {
          setSearching(false);
        }
      }
    },
    [beginRequest, isLatestRequest],
  );

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length === 0) {
      /* eslint-disable react-hooks/set-state-in-effect -- invalidate in-flight search on clear */
      beginRequest();
      setSearchResults([]);
      setHasSearched(false);
      setSearching(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    const validated = validateFriendSearchQuery(debouncedQuery);
    if (!validated.ok) {
      beginRequest();
      setSearchResults([]);
      setHasSearched(false);
      setSearching(false);
      return;
    }
    void runSearch(debouncedQuery, { showFieldError: false });
  }, [beginRequest, debouncedQuery, runSearch]);

  const handleSearch = () => {
    if (searching) {
      return;
    }
    void runSearch(query, { showFieldError: true });
  };

  const flashSuccess = useCallback((success: string) => {
    setSuccessMessage(success);
    void feedback("success");
  }, []);

  const runAction = async (
    uid: string,
    action: () => Promise<unknown>,
    success: string,
  ) => {
    setBusyUid(uid);
    setError(null);
    try {
      await action();
      await refresh({ soft: true });
      setSearchResults((prev) => prev.filter((entry) => entry.uid !== uid));
      flashSuccess(success);
      setSelectedUid(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Action failed.",
      );
      void feedback("error");
    } finally {
      setBusyUid(null);
    }
  };

  const relationshipUids = useMemo(
    () =>
      new Set(
        [...friends, ...incoming, ...outgoing].map((entry) => entry.uid),
      ),
    [friends, incoming, outgoing],
  );

  const requestableResults = useMemo(
    () =>
      loadingList
        ? []
        : searchResults.filter((entry) => !relationshipUids.has(entry.uid)),
    [loadingList, relationshipUids, searchResults],
  );

  const selectableEntries = useMemo((): SelectableFriend[] => {
    return [
      ...incoming.map((entry) => ({ ...entry, relation: "incoming" as const })),
      ...outgoing.map((entry) => ({ ...entry, relation: "outgoing" as const })),
      ...friends.map((entry) => ({ ...entry, relation: "friend" as const })),
    ];
  }, [friends, incoming, outgoing]);

  const selectedSearchHit =
    selectedUid == null
      ? null
      : (requestableResults.find((entry) => entry.uid === selectedUid) ?? null);

  const selectedEntry =
    selectableEntries.find((entry) => entry.uid === selectedUid) ??
    (selectedSearchHit
      ? ({ ...selectedSearchHit, relation: "search" as const } satisfies SelectableFriend)
      : null);

  useEffect(() => {
    if (selectedUid == null) {
      return;
    }
    const stillListed =
      selectableEntries.some((entry) => entry.uid === selectedUid) ||
      requestableResults.some((entry) => entry.uid === selectedUid);
    if (!stillListed) {
      /* eslint-disable react-hooks/set-state-in-effect -- clear selection when the uid leaves the list */
      setSelectedUid(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [selectableEntries, requestableResults, selectedUid]);

  return {
    query,
    queryError,
    onQueryChange,
    handleSearch,
    hasSearched,
    requestableResults,
    friends,
    incoming,
    outgoing,
    loadingList,
    refreshing,
    pullRefresh,
    searching,
    busyUid,
    error,
    successMessage,
    flashSuccess,
    selectedUid,
    setSelectedUid,
    selectedEntry,
    selectedSearchHit,
    selectableEntries,
    listTab,
    setListTab,
    requestFriend: (uid: string) =>
      runAction(uid, () => requestFriend(uid), "Friend request sent."),
    acceptFriend: (uid: string) =>
      runAction(uid, () => acceptFriendRequest(uid), "Friend request accepted."),
    declineFriend: (uid: string) =>
      runAction(uid, () => declineFriendRequest(uid), "Request declined."),
    cancelFriend: (uid: string) =>
      runAction(uid, () => cancelFriendRequest(uid), "Request cancelled."),
    removeFriend: (uid: string) =>
      runAction(uid, () => removeFriend(uid), "Removed from friends."),
  };
}

export type FriendsPanelModel = ReturnType<typeof useFriendsPanelModel>;
