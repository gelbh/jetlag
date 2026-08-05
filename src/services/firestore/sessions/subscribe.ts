import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import type { SessionRecord } from "@/domain/map/annotations";
import {
  deserializeSessionFromFirestore,
  parseEndGameTruthAnchors,
} from "../serialization/serializeSession";
import { sessionsCollection, endGameTruthAnchorsDoc } from "./shared";

export function subscribeToSession(
  sessionId: string,
  onChange: (session: SessionRecord) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(sessionsCollection(), sessionId),
    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      onChange(
        deserializeSessionFromFirestore(
          snapshot.id,
          snapshot.data() as Record<string, unknown>,
        ),
      );
    },
    (error) => onError(error),
  );
}

/** Hider/observer/admin-only freeze points (not on the seeker-readable session doc). */
export function subscribeToEndGameTruthAnchors(
  sessionId: string,
  onChange: (
    anchors: SessionRecord["endGameTruthAnchors"] | undefined,
  ) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    endGameTruthAnchorsDoc(sessionId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(undefined);
        return;
      }

      onChange(parseEndGameTruthAnchors(snapshot.data()?.anchors));
    },
    (error) => onError(error),
  );
}

