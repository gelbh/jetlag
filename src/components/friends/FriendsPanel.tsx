import { InlineError } from "../ui/banners/InlineError";
import { EmptyState } from "../ui/feedback/EmptyState";
import { SearchField } from "../ui/forms/SearchField";
import { useFriendsPanelModel } from "./useFriendsPanelModel";

export function FriendsPanel() {
  const model = useFriendsPanelModel();
  const {
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
    searching,
    busyUid,
    error,
    requestFriend,
    acceptFriend,
    declineFriend,
    cancelFriend,
  } = model;

  const addFriendsSection = (
    <div className="space-y-2">
      <p className="font-display text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-ink-dim">
        Add friends
      </p>
      <SearchField
        label="Search username"
        value={query}
        onChange={onQueryChange}
        onSubmit={() => void handleSearch()}
        submitLabel="Search"
        loading={searching || loadingList}
        placeholder="seeker_one"
      />
      {queryError ? <InlineError>{queryError}</InlineError> : null}
      {hasSearched && !searching && requestableResults.length === 0 && !error ? (
        <EmptyState>No users found for that username.</EmptyState>
      ) : null}
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
                onClick={() => void requestFriend(entry.uid)}
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

  return (
    <div className="space-y-5 border-t-2 border-border pt-4">
      {addFriendsSection}

      {error ? <InlineError>{error}</InlineError> : null}

      <section className="space-y-2">
        <p className="font-display text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          Incoming requests
        </p>
        {loadingList ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : incoming.length === 0 ? (
          <EmptyState>No pending requests.</EmptyState>
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
                    onClick={() => void acceptFriend(entry.uid)}
                    className="btn-primary min-h-11 px-3 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={busyUid === entry.uid}
                    onClick={() => void declineFriend(entry.uid)}
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
        <p className="font-display text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          Outgoing
        </p>
        {loadingList ? null : outgoing.length === 0 ? (
          <EmptyState>No outgoing requests.</EmptyState>
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
                  onClick={() => void cancelFriend(entry.uid)}
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
        <p className="font-display text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          Your friends
        </p>
        {loadingList ? null : friends.length === 0 ? (
          <EmptyState>
            No friends yet. Search for a username above to send a request.
          </EmptyState>
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