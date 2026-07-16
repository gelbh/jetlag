import { useCallback, useEffect, useState } from "react";
import { InlineError } from "../ui/InlineError";
import { SearchField } from "../ui/SearchField";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  listFriends,
  requestFriend,
  searchFriends,
  type FriendListEntry,
} from "../../services/profile/profileFriends";

export function FriendsPanel() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendListEntry[]>([]);
  const [friends, setFriends] = useState<FriendListEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendListEntry[]>([]);
  const [outgoing, setOutgoing] = useState<FriendListEntry[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searching, setSearching] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    void refresh();
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

  return (
    <div className="space-y-5 border-t-2 border-border pt-4">
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
          loading={searching}
          placeholder="seeker_one"
        />
        {searchResults.length > 0 ? (
          <ul className="m-0 list-none space-y-2 p-0">
            {searchResults.map((entry) => (
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
