import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb, isFirebaseConfigured } from "../core/firebase/firebase";

export interface IncidentNotice {
  incidentId: string;
  status: "resolved";
  resolvedAt: string;
  bannerDismissedAt: string | null;
}

function noticesCollection(uid: string) {
  return collection(getFirestoreDb(), "users", uid, "incidentNotices");
}

function parseNotice(
  id: string,
  data: Record<string, unknown>,
): IncidentNotice | null {
  const resolvedAt =
    typeof data.resolvedAt === "string" && data.resolvedAt.length > 0
      ? data.resolvedAt
      : null;
  if (!resolvedAt) {
    return null;
  }

  const bannerDismissedAt =
    typeof data.bannerDismissedAt === "string" ? data.bannerDismissedAt : null;

  return {
    incidentId:
      typeof data.incidentId === "string" && data.incidentId.length > 0
        ? data.incidentId
        : id,
    status: "resolved",
    resolvedAt,
    bannerDismissedAt,
  };
}

export function listenUndismissedIncidentNotices(
  uid: string,
  onChange: (notices: IncidentNotice[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    onChange([]);
    return () => undefined;
  }

  const noticesQuery = query(
    noticesCollection(uid),
    where("bannerDismissedAt", "==", null),
  );

  return onSnapshot(
    noticesQuery,
    (snapshot) => {
      const notices: IncidentNotice[] = [];
      for (const docSnap of snapshot.docs) {
        const parsed = parseNotice(
          docSnap.id,
          docSnap.data() as Record<string, unknown>,
        );
        if (parsed) {
          notices.push(parsed);
        }
      }
      onChange(notices);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function dismissIncidentNotice(
  uid: string,
  incidentId: string,
): Promise<void> {
  await updateDoc(
    doc(getFirestoreDb(), "users", uid, "incidentNotices", incidentId),
    { bannerDismissedAt: new Date().toISOString() },
  );
}
