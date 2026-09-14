import { useDesktopLayout } from "../../hooks/layout/useDesktopLayout";
import type { FriendListEntry } from "../../services/profile/profileFriends";
import { InlineError } from "../ui/banners/InlineError";
import { EmptyState } from "../ui/feedback/EmptyState";
import { SearchField } from "../ui/forms/SearchField";
import {
  relationLabel,
  useFriendsPanelModel,
  type FriendRelation,
  type SelectableFriend,
} from "./useFriendsPanelModel";

export function FriendsPanel() {
  const isDesktop = useDesktopLayout();
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
    selectedUid,
    setSelectedUid,
    selectedEntry,
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
                onAccept={() => void acceptFriend(selectedEntry.uid)}
                onDecline={() => void declineFriend(selectedEntry.uid)}
                onCancel={() => void cancelFriend(selectedEntry.uid)}
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
      <p className="font-display text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-ink-dim">
        {title}
      </p>
      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : entries.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
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
        <p className="font-display text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-ink-dim">
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
