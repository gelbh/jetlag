import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import type { PreloadRequest } from "../../domain/preloadRequest/preloadRequestTypes";
import { deserializePreloadRequest } from "../../domain/preloadRequest/preloadRequestAdmin";
import { forceRefreshIdToken } from "../core/auth/forceRefreshIdToken";
import { getFirestoreDb } from "../core/firebase/firebase";

function preloadRequestsCollection() {
  return collection(getFirestoreDb(), "preloadRequests");
}

/** Admin inbox: live list ordered by most recently updated. */
export function subscribePreloadRequestList(
  onChange: (requests: PreloadRequest[]) => void,
  onError: (error: Error) => void,
  options: { limitCount?: number } = {},
): Unsubscribe {
  const limitCount = options.limitCount ?? 50;
  let unsubscribed = false;
  let activeUnsub: Unsubscribe | null = null;
  let retriedAuth = false;

  const attach = () => {
    activeUnsub = onSnapshot(
      query(
        preloadRequestsCollection(),
        orderBy("updatedAt", "desc"),
        limit(limitCount),
      ),
      (snapshot) => {
        const requests: PreloadRequest[] = [];
        for (const docSnapshot of snapshot.docs) {
          const request = deserializePreloadRequest(
            docSnapshot.id,
            docSnapshot.data() as Record<string, unknown>,
          );
          if (request) {
            requests.push(request);
          }
        }
        onChange(requests);
      },
      (error) => {
        const permissionDenied =
          error instanceof FirebaseError && error.code === "permission-denied";
        if (!retriedAuth && permissionDenied && !unsubscribed) {
          retriedAuth = true;
          activeUnsub?.();
          activeUnsub = null;
          void forceRefreshIdToken()
            .then(() => {
              if (!unsubscribed) {
                attach();
              }
            })
            .catch((refreshError) => {
              onError(
                refreshError instanceof Error
                  ? refreshError
                  : new Error(String(refreshError)),
              );
            });
          return;
        }
        onError(error);
      },
    );
  };

  attach();

  return () => {
    unsubscribed = true;
    activeUnsub?.();
    activeUnsub = null;
  };
}
