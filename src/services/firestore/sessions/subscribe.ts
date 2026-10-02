import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import type { SessionRecord } from "@/domain/map/annotations";
import {
  deserializeSessionFromFirestore,
  parseEndGameTruthAnchors,
} from "../serialization/serializeSession";
import { handleFirestoreListenError } from "./listenError";
import { endGameTruthAnchorsDoc, sessionsCollection } from "./shared";

export function subscribeToSession(
  sessionId: string,
  onChange: (session: SessionRecord) => void,
  onError: (error: Error) => void,
  onMetadata?: (metadata: { fromCache: boolean }) => void,
): Unsubscribe {
  // includeMetadataChanges so the cache→server flip reaches `onMetadata`;
  // metadata-only events still call `onChange`, which `setSession` dedupes.
  return onSnapshot(
    doc(sessionsCollection(), sessionId),
    { includeMetadataChanges: true },
    (snapshot) => {
      onMetadata?.({ fromCache: snapshot.metadata.fromCache });
      if (!snapshot.exists()) {
        return;
      }

      onChange(
        deserializeSessionFromFirestore(snapshot.id, snapshot.data() as Record<string, unknown>),
      );
    },
    (error) => handleFirestoreListenError(error, onError),
  );
}

/** Hider/observer/admin-only freeze points (not on the seeker-readable session doc). */
export function subscribeToEndGameTruthAnchors(
  sessionId: string,
  onChange: (anchors: SessionRecord["endGameTruthAnchors"] | undefined) => void,
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
    (error) => handleFirestoreListenError(error, onError),
  );
}
