export const JOIN_REQUEST_TTL_MS = 10 * 60 * 1000;

export type JoinRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "expired";

export type JoinRequestRole = "seeker" | "hider" | "observer";

export interface RoleJoinRequest {
  id: string;
  sessionId: string;
  requesterUid: string;
  role: JoinRequestRole;
  status: JoinRequestStatus;
  identityLabel: string;
  createdAt: string;
  expiresAt: string;
  resolvedAt?: string;
  resolvedByUid?: string;
}

export function computeJoinRequestExpiresAt(createdAtMs: number): string {
  return new Date(createdAtMs + JOIN_REQUEST_TTL_MS).toISOString();
}

export function isJoinRequestExpired(
  request: Pick<RoleJoinRequest, "expiresAt" | "status">,
  nowMs: number,
): boolean {
  if (request.status !== "pending") {
    return false;
  }
  return nowMs >= Date.parse(request.expiresAt);
}
