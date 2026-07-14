import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import type { GameResultRecord } from "../../domain/game/gameResult";
import { getFirestoreDb } from "../core/firebase";
import { deserializeGameResultFromFirestore } from "./firestoreSerialization";

function gameResultDoc(sessionId: string, gameResultId: string) {
  return doc(
    getFirestoreDb(),
    "sessions",
    sessionId,
    "gameResult",
    gameResultId,
  );
}

export function subscribeToGameResult(
  sessionId: string,
  gameResultId: string,
  onChange: (result: GameResultRecord) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    gameResultDoc(sessionId, gameResultId),
    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      onChange(
        deserializeGameResultFromFirestore(
          snapshot.id,
          sessionId,
          snapshot.data() as Record<string, unknown>,
        ),
      );
    },
    (error) => onError(error),
  );
}
