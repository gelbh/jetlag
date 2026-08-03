import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import type {
  JoinRequestRole,
  JoinRequestStatus,
  RoleJoinRequest,
} from "../../domain/session/players/joinRequest";
import { getFirestoreDb, isFirebaseConfigured } from "../core/firebase/firebase";

const JOIN_REQUEST_ROLES = new Set<JoinRequestRole>([
  "seeker",
  "hider",
  "observer",
]);

const JOIN_REQUEST_STATUSES = new Set<JoinRequestStatus>([
  "pending",
  "accepted",
  "declined",
  "cancelled",
  "expired",
]);

function joinRequestsCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "joinRequests");
}

function mapJoinRequest(
  id: string,
  data: Record<string, unknown>,
): RoleJoinRequest | null {
  const role = data.role;
  const status = data.status;
  if (
    typeof role !== "string" ||
    !JOIN_REQUEST_ROLES.has(role as JoinRequestRole) ||
    typeof status !== "string" ||
    !JOIN_REQUEST_STATUSES.has(status as JoinRequestStatus)
  ) {
    return null;
  }

  return {
    id,
    sessionId: typeof data.sessionId === "string" ? data.sessionId : "",
    requesterUid:
      typeof data.requesterUid === "string" ? data.requesterUid : "",
    role: role as JoinRequestRole,
    status: status as JoinRequestStatus,
    identityLabel:
      typeof data.identityLabel === "string"
        ? data.identityLabel
        : "Anonymous player",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    expiresAt: typeof data.expiresAt === "string" ? data.expiresAt : "",
    resolvedAt:
      typeof data.resolvedAt === "string" ? data.resolvedAt : undefined,
    resolvedByUid:
      typeof data.resolvedByUid === "string" ? data.resolvedByUid : undefined,
  };
}

export function listenOwnJoinRequest(
  sessionId: string,
  requestId: string,
  onChange: (request: RoleJoinRequest | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    onError(new Error("Firebase is not configured."));
    return () => undefined;
  }

  return onSnapshot(
    doc(joinRequestsCollection(sessionId), requestId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      onChange(
        mapJoinRequest(
          snapshot.id,
          snapshot.data() as Record<string, unknown>,
        ),
      );
    },
    (error) => onError(error),
  );
}

export function listenLeaderJoinRequests(
  sessionId: string,
  roles: readonly JoinRequestRole[],
  onChange: (requests: RoleJoinRequest[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    onError(new Error("Firebase is not configured."));
    return () => undefined;
  }

  if (roles.length === 0) {
    onChange([]);
    return () => undefined;
  }

  return onSnapshot(
    query(
      joinRequestsCollection(sessionId),
      where("status", "==", "pending"),
      where("role", "in", [...roles]),
    ),
    (snapshot) => {
      const requests = snapshot.docs
        .map((requestDoc) =>
          mapJoinRequest(
            requestDoc.id,
            requestDoc.data() as Record<string, unknown>,
          ),
        )
        .filter((request): request is RoleJoinRequest => request != null)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      onChange(requests);
    },
    (error) => onError(error),
  );
}
