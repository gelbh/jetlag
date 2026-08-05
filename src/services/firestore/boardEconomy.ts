import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { BoardEconomyState } from "../../domain/boardEconomy";
import { createInitialBoardEconomyState } from "../../domain/boardEconomy";
import { getFirestoreDb } from "../core/firebase/firebase";

const STATE_DOC = "state";

function boardEconomyStateRef(sessionId: string) {
  return doc(
    getFirestoreDb(),
    "sessions",
    sessionId,
    "boardEconomy",
    STATE_DOC,
  );
}

export function serializeBoardEconomyState(
  state: BoardEconomyState,
): Record<string, unknown> {
  return {
    deck: state.deck,
    hand: state.hand,
    discard: state.discard,
    handLimit: state.handLimit,
    activeCurses: state.activeCurses,
    pendingPick: state.pendingPick,
    updatedAt: new Date().toISOString(),
  };
}

export function deserializeBoardEconomyState(
  data: Record<string, unknown>,
): BoardEconomyState | null {
  if (
    !Array.isArray(data.deck) ||
    !Array.isArray(data.hand) ||
    !Array.isArray(data.discard) ||
    typeof data.handLimit !== "number" ||
    !Array.isArray(data.activeCurses)
  ) {
    return null;
  }
  const pendingPick =
    data.pendingPick &&
    typeof data.pendingPick === "object" &&
    Array.isArray((data.pendingPick as { drawn?: unknown }).drawn) &&
    typeof (data.pendingPick as { keep?: unknown }).keep === "number" &&
    Array.isArray((data.pendingPick as { cyclesRemaining?: unknown }).cyclesRemaining)
      ? (data.pendingPick as BoardEconomyState["pendingPick"])
      : null;
  return {
    deck: data.deck as BoardEconomyState["deck"],
    hand: data.hand as BoardEconomyState["hand"],
    discard: data.discard as BoardEconomyState["discard"],
    handLimit: data.handLimit,
    activeCurses: data.activeCurses as BoardEconomyState["activeCurses"],
    pendingPick,
  };
}

export async function ensureBoardEconomyState(
  sessionId: string,
  seed: string,
): Promise<BoardEconomyState> {
  const ref = boardEconomyStateRef(sessionId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const parsed = deserializeBoardEconomyState(snap.data() as Record<string, unknown>);
    if (parsed) {
      return parsed;
    }
  }
  const initial = createInitialBoardEconomyState(seed);
  await setDoc(ref, serializeBoardEconomyState(initial));
  return initial;
}

export async function writeBoardEconomyState(
  sessionId: string,
  state: BoardEconomyState,
): Promise<void> {
  await setDoc(boardEconomyStateRef(sessionId), serializeBoardEconomyState(state));
}

export async function updateBoardEconomyEnabled(
  sessionId: string,
  enabled: boolean,
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "sessions", sessionId), {
    boardEconomyEnabled: enabled,
  });
}

export function subscribeBoardEconomyState(
  sessionId: string,
  onChange: (state: BoardEconomyState | null) => void,
): Unsubscribe {
  return onSnapshot(boardEconomyStateRef(sessionId), (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    onChange(
      deserializeBoardEconomyState(snap.data() as Record<string, unknown>),
    );
  });
}
