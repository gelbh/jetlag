import { create } from "zustand";

export type WriteLabel =
  | "chat.send"
  | "question.ask"
  | "question.answer"
  | "question.cancel"
  | "question.update"
  | "endgame.start"
  | "found.request"
  | "found.confirm"
  | "found.decline"
  | "timetrap.place"
  | "economy.update"
  | "session.end"
  | "move.intent"
  | "zone.write"
  | "system.message"
  | "timer.update"
  | "restored";

type LedgerEntryBase = { id: string; label: WriteLabel; startedAt: number };

export type LedgerEntry =
  | (LedgerEntryBase & { status: "pending" })
  | (LedgerEntryBase & { status: "failed"; error: string });

interface WriteLedgerState {
  entries: Record<string, LedgerEntry>;
  begin: (label: WriteLabel) => string;
  /** Drop an entry: on server ack, or once a failure has been surfaced. */
  remove: (id: string) => void;
  fail: (id: string, message: string) => void;
}

let seq = 0;

function withoutEntry(
  entries: Record<string, LedgerEntry>,
  id: string,
): Record<string, LedgerEntry> {
  const next = { ...entries };
  delete next[id];
  return next;
}

/** Firestore writes not yet acknowledged by the server (in-memory; the SDK owns durability). */
export const useWriteLedgerStore = create<WriteLedgerState>()((set) => ({
  entries: {},
  begin: (label) => {
    const id = `w${Date.now().toString(36)}${(seq++).toString(36)}`;
    set((s) => ({
      entries: {
        ...s.entries,
        [id]: { id, label, startedAt: Date.now(), status: "pending" },
      },
    }));
    return id;
  },
  remove: (id) => set((s) => (s.entries[id] ? { entries: withoutEntry(s.entries, id) } : s)),
  fail: (id, message) =>
    set((s) => {
      const entry = s.entries[id];
      if (!entry) {
        return s;
      }
      return {
        entries: {
          ...s.entries,
          [id]: { ...entry, status: "failed", error: message },
        },
      };
    }),
}));

type LedgerSnapshot = Pick<WriteLedgerState, "entries">;

export function selectPendingCount(state: LedgerSnapshot): number {
  let count = 0;
  for (const entry of Object.values(state.entries)) {
    if (entry.status === "pending") {
      count += 1;
    }
  }
  return count;
}

/** Consumed by the pending-age escalation (plan Task 5). */
export function selectOldestPendingAgeMs(state: LedgerSnapshot, now = Date.now()): number | null {
  let oldest: number | null = null;
  for (const entry of Object.values(state.entries)) {
    if (entry.status === "pending" && (oldest === null || entry.startedAt < oldest)) {
      oldest = entry.startedAt;
    }
  }
  return oldest === null ? null : now - oldest;
}

export function selectFailedEntries(state: LedgerSnapshot): LedgerEntry[] {
  return Object.values(state.entries).filter((entry) => entry.status === "failed");
}
