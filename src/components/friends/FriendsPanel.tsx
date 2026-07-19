import { useCallback, useEffect, useMemo, useState } from "react";
import { useDesktopLayout } from "../../hooks/useDesktopLayout";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  listFriends,
  requestFriend,
  searchFriends,
  type FriendListEntry,
} from "../../services/profile/profileFriends";
import { InlineError } from "../ui/InlineError";
import { SearchField } from "../ui/SearchField";

type FriendRelation = "incoming" | "outgoing" | "friend";

interface SelectableFriend extends FriendListEntry {
  relation: FriendRelation;
}

function relationLabel(relation: FriendRelation): string {
  switch (relation) {
    case "incoming":
      return "Incoming request";
    case "outgoing":
      return "Outgoing request";
    case "friend":
      return "Friend";
    default: {
      const _exhaustive: never = relation;
      return _exhaustive;
    }
  }
}

export function FriendsPanel() {
  const isDesktop = useDesktopLayout();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendListEntry[]>([]);
  const [friends, setFriends] = useState<FriendListEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendListEntry[]>([]);
  const [outgoing, setOutgoing] = useState<FriendListEntry[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searching, setSearching] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const next = await listFriends();
      setFriends(next.friends);
      setIncoming(next.incoming);
      setOutgoing(next.outgoing);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Could not load friends.",
      );
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- initial friends list load */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refresh]);

  const handleSearch = async () => {
    setSearching(true);
    setError(null);
    try {
      const next = await searchFriends(query);
      setSearchResults(next.results);
    } catch (nextError) {
      setSearchResults([]);
      setError(
        nextError instanceof Error ? nextError.message : "Search failed.",
      );
    } finally {
      setSearching(false);
    }
  };

  const runAction = async (uid: string, action: () => Promise<unknown>) => {
    setBusyUid(uid);
    setError(null);
    try {
      await action();
      await refresh();
      setSearchResults((prev) => prev.filter((entry) => entry.uid !== uid));
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Action failed.",
      );
    } finally {
      setBusyUid(null);
    }
  };

  const relationshipUids = new Set(
    [...friends, ...incoming, ...outgoing].map((entry) => entry.uid),
  );
  const requestableResults = loadingList
    ? []
    : searchResults.filter((entry) => !relationshipUids.has(entry.uid));

  const selectableEntries = useMemo((): SelectableFriend[] => {
    return [
      ...incoming.map((entry) => ({ ...entry, relation: "incoming" as const })),
      ...outgoing.map((entry) => ({ ...entry, relation: "outgoing" as const })),
      ...friends.map((entry) => ({ ...entry, relation: "friend" as const })),
    ];
  }, [friends, incoming, outgoing]);

  const selectedEntry =
    selectableEntries.find((entry) => entry.uid === selectedUid) ?? null;

  useEffect(() => {
    if (selectedUid == null) {
      return;
    }
    if (!selectableEntries.some((entry) => entry.uid === selectedUid)) {
      /* eslint-disable react-hooks/set-state-in-effect -- clear selection when the uid leaves the list */
      setSelectedUid(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [selectableEntries, selectedUid]);

  const addFriendsSection = (
    <div className="space-y-2">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
        Add friends
      </p>
      <SearchField
        label="Search username"
        value={query}
        onChange={setQuery}
        onSubmit={() => void handleSearch()}
        submitLabel="Search"
        loading={searching || loadingList}
        placeholder="seeker_one"
      />
      {requestableResults.length > 0 ? (
        <ul className="m-0 list-none space-y-2 p-0">
          {requestableResults.map((entry) => (
            <li
              key={entry.uid}
              className="flex items-center justify-between gap-2 border-b border-border/60 py-2"
            >
              <span className="truncate font-display text-sm font-semibold uppercase tracking-wide text-ink">
                {entry.username}
              </span>
              <button
                type="button"
                disabled={busyUid === entry.uid}
                onClick={() =>
                  void runAction(entry.uid, () => requestFriend(entry.uid))
                }
                className="btn-secondary min-h-11 shrink-0 px-3 disabled:opacity-50"
              >
                {busyUid === entry.uid ? "Sending…" : "Request"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  if (isDesktop) {
    return (
      <div className="space-y-5 border-t-2 border-border pt-4">
        {addFriendsSection}
        {error ? <InlineError>{error}</InlineError> : null}
        <div className="flex min-w-0 gap-4">
          <nav
            aria-label="Friends list"
            className="w-[14rem] shrink-0 space-y-4 border-r-2 border-border pr-3"
            data-testid="friends-master-list"
          >
            <DesktopListSection
              title="Incoming requests"
              empty="No pending requests."
              loading={loadingList}
              entries={incoming}
              relation="incoming"
              selectedUid={selectedUid}
              onSelect={setSelectedUid}
            />
            <DesktopListSection
              title="Outgoing"
              empty="No outgoing requests."
              loading={loadingList}
              entries={outgoing}
              relation="outgoing"
              selectedUid={selectedUid}
              onSelect={setSelectedUid}
              hideWhileLoading
            />
            <DesktopListSection
              title="Your friends"
              empty="No friends yet. Search for a username above to send a request."
              loading={loadingList}
              entries={friends}
              relation="friend"
              selectedUid={selectedUid}
              onSelect={setSelectedUid}
              hideWhileLoading
            />
          </nav>
          <aside
            role="complementary"
            aria-label="Friend detail"
            className="min-w-0 flex-1 space-y-3"
            data-testid="friends-detail-pane"
          >
            {selectedEntry ? (
              <FriendDetail
                entry={selectedEntry}
                busyUid={busyUid}
                onAccept={() =>
                  void runAction(selectedEntry.uid, () =>
                    acceptFriendRequest(selectedEntry.uid),
                  )
                }
                onDecline={() =>
                  void runAction(selectedEntry.uid, () =>
                    declineFriendRequest(selectedEntry.uid),
                  )
                }
                onCancel={() =>
                  void runAction(selectedEntry.uid, () =>
                    cancelFriendRequest(selectedEntry.uid),
                  )
                }
              />
            ) : (
              <p className="text-sm leading-relaxed text-ink-muted">
                Select a friend or request to see details and actions.
              </p>
            )}
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 border-t-2 border-border pt-4">
      {addFriendsSection}

      {error ? <InlineError>{error}</InlineError> : null}

      <section className="space-y-2">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          Incoming requests
        </p>
        {loadingList ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : incoming.length === 0 ? (
          <p className="text-sm text-ink-muted">No pending requests.</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {incoming.map((entry) => (
              <li
                key={entry.uid}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2"
              >
                <span className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
                  {entry.username}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyUid === entry.uid}
                    onClick={() =>
                      void runAction(entry.uid, () =>
                        acceptFriendRequest(entry.uid),
                      )
                    }
                    className="btn-primary min-h-11 px-3 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={busyUid === entry.uid}
                    onClick={() =>
                      void runAction(entry.uid, () =>
                        declineFriendRequest(entry.uid),
                      )
                    }
                    className="btn-secondary min-h-11 px-3 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          Outgoing
        </p>
        {loadingList ? null : outgoing.length === 0 ? (
          <p className="text-sm text-ink-muted">No outgoing requests.</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {outgoing.map((entry) => (
              <li
                key={entry.uid}
                className="flex items-center justify-between gap-2 border-b border-border/60 py-2"
              >
                <span className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
                  {entry.username}
                </span>
                <button
                  type="button"
                  disabled={busyUid === entry.uid}
                  onClick={() =>
                    void runAction(entry.uid, () =>
                      cancelFriendRequest(entry.uid),
                    )
                  }
                  className="btn-secondary min-h-11 px-3 disabled:opacity-50"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          Your friends
        </p>
        {loadingList ? null : friends.length === 0 ? (
          <p className="text-sm leading-relaxed text-ink-muted">
            No friends yet. Search for a username above to send a request.
          </p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {friends.map((entry) => (
              <li
                key={entry.uid}
                className="border-b border-border/60 py-2 font-display text-sm font-semibold uppercase tracking-wide text-ink"
              >
                {entry.username}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DesktopListSection({
  title,
  empty,
  loading,
  entries,
  relation,
  selectedUid,
  onSelect,
  hideWhileLoading = false,
}: {
  title: string;
  empty: string;
  loading: boolean;
  entries: FriendListEntry[];
  relation: FriendRelation;
  selectedUid: string | null;
  onSelect: (uid: string) => void;
  hideWhileLoading?: boolean;
}) {
  if (loading && hideWhileLoading) {
    return null;
  }

  return (
    <section className="space-y-2">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
        {title}
      </p>
      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="m-0 list-none space-y-1 p-0">
          {entries.map((entry) => {
            const selected = selectedUid === entry.uid;
            return (
              <li key={`${relation}-${entry.uid}`}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(entry.uid)}
                  className={`flex min-h-11 w-full items-center rounded-[var(--radius-hud-sm)] px-2 text-left font-display text-sm font-semibold uppercase tracking-wide transition-colors ${
                    selected
                      ? "bg-ink text-surface-deep"
                      : "text-ink hover:bg-surface-raised"
                  }`}
                >
                  <span className="truncate">{entry.username}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function FriendDetail({
  entry,
  busyUid,
  onAccept,
  onDecline,
  onCancel,
}: {
  entry: SelectableFriend;
  busyUid: string | null;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  const busy = busyUid === entry.uid;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          {relationLabel(entry.relation)}
        </p>
        <h2 className="font-display text-xl font-bold uppercase tracking-tight text-ink">
          {entry.username}
        </h2>
      </div>
      {entry.relation === "incoming" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onAccept}
            className="btn-primary min-h-11 px-3 disabled:opacity-50"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDecline}
            className="btn-secondary min-h-11 px-3 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      ) : null}
      {entry.relation === "outgoing" ? (
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="btn-secondary min-h-11 px-3 disabled:opacity-50"
        >
          Cancel
        </button>
      ) : null}
      {entry.relation === "friend" ? (
        <p className="text-sm leading-relaxed text-ink-muted">
          Connected. You’ll see each other on friends leaderboards when opted
          in.
        </p>
      ) : null}
    </div>
  );
}
