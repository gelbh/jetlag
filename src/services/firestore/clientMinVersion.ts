import { doc, getDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import {
  CLIENT_MIN_VERSION_COLLECTION,
  CLIENT_MIN_VERSION_DOC_ID,
  parseClientMinVersionDoc,
} from "@/domain/device/clientMinVersion";
import { getFirestoreDb, isFirebaseConfigured } from "../core/firebase/firebase";

function clientMinVersionDoc() {
  return doc(
    getFirestoreDb(),
    CLIENT_MIN_VERSION_COLLECTION,
    CLIENT_MIN_VERSION_DOC_ID,
  );
}

/** One-shot read for boot / before-join checks. */
export async function fetchClientMinVersion(): Promise<string | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }
  const snapshot = await getDoc(clientMinVersionDoc());
  if (!snapshot.exists()) {
    return null;
  }
  return parseClientMinVersionDoc(snapshot.data());
}

export function subscribeClientMinVersion(
  onChange: (minVersion: string | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    onChange(null);
    return () => {};
  }

  return onSnapshot(
    clientMinVersionDoc(),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      onChange(parseClientMinVersionDoc(snapshot.data()));
    },
    (error) => onError(error),
  );
}
