import { trackSessionEnded } from "../core/analytics/analytics";
import { callWithResilience } from "../core/firebase/callWithResilience";
import { isFirebaseConfigured } from "../core/firebase/firebase";

export type LeaveHostSessionResult =
  | { action: "promoted"; newHostUid: string }
  | { action: "ended" };

export async function leaveHostSession(sessionId: string): Promise<LeaveHostSessionResult> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  // Not retried: a repeat after a lost "promoted" response fails "not host",
  // which callers would misread as an already-ended session.
  return callWithResilience<{ sessionId: string }, LeaveHostSessionResult>(
    "leaveHostSession",
    { sessionId },
    { idempotent: false },
  );
}

export type RepairGhostHostResult =
  | { action: "repaired"; newHostUid: string }
  | { action: "noop"; hostUid: string };

export async function repairGhostHost(sessionId: string): Promise<RepairGhostHostResult> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const data = await callWithResilience<{ sessionId: string }, RepairGhostHostResult>(
    "repairGhostHost",
    { sessionId },
    { idempotent: true },
  );
  if (
    data?.action === "repaired" &&
    typeof data.newHostUid === "string" &&
    data.newHostUid.length > 0
  ) {
    return { action: "repaired", newHostUid: data.newHostUid };
  }
  if (data?.action === "noop" && typeof data.hostUid === "string") {
    return { action: "noop", hostUid: data.hostUid };
  }
  throw new Error("Unexpected repairGhostHost response.");
}

export async function endSession(sessionId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  await callWithResilience<{ sessionId: string }, { ok: boolean }>(
    "endSession",
    { sessionId },
    { idempotent: true },
  );
  trackSessionEnded("host_end");
}
