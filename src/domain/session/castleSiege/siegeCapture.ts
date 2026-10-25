import { pauseSiegeClock, type SiegeClockState } from "./siegeClocks";
import { isCaptureAllowed, type SiegeGuardState } from "./siegeGuards";
import type { StandoffTeamId } from "./standoffTurn";

/** Defender confirm window (7A short timeout). */
export const CAPTURE_CONFIRM_TIMEOUT_MS = 60_000;

export type SiegeCaptureStatus = "idle" | "pending" | "confirmed" | "timeout" | "disputed";

export type SiegeCaptureState = {
  status: SiegeCaptureStatus;
  attackingTeamId: StandoffTeamId | null;
  submittedByUid: string | null;
  photoStoragePath: string | null;
  submittedAtMs: number | null;
  confirmDeadlineMs: number | null;
  resolvedAtMs: number | null;
  resolvedByUid: string | null;
};

export type CaptureFailReason = "capture_blocked" | "already_pending" | "invalid" | "not_pending";

export function createIdleSiegeCapture(): SiegeCaptureState {
  return {
    status: "idle",
    attackingTeamId: null,
    submittedByUid: null,
    photoStoragePath: null,
    submittedAtMs: null,
    confirmDeadlineMs: null,
    resolvedAtMs: null,
    resolvedByUid: null,
  };
}

export function isCaptureWin(capture: SiegeCaptureState): boolean {
  return capture.status === "confirmed" || capture.status === "timeout";
}

export function submitSiegeCapture(opts: {
  capture: SiegeCaptureState;
  clock: SiegeClockState;
  guards: SiegeGuardState;
  nowMs: number;
  attackingTeamId: StandoffTeamId;
  submittedByUid: string;
  photoStoragePath: string;
}): { ok: true; capture: SiegeCaptureState } | { ok: false; reason: CaptureFailReason } {
  if (!isCaptureAllowed(opts.clock, opts.guards)) {
    return { ok: false, reason: "capture_blocked" };
  }
  if (opts.clock.roles[opts.attackingTeamId] !== "attack") {
    return { ok: false, reason: "invalid" };
  }
  // Trailing team waits out Dusk head-start before they may submit a capture.
  if (
    opts.clock.headStartEndsAtMs != null &&
    opts.clock.headStartTeamId != null &&
    opts.attackingTeamId !== opts.clock.headStartTeamId &&
    opts.nowMs < opts.clock.headStartEndsAtMs
  ) {
    return { ok: false, reason: "capture_blocked" };
  }
  if (opts.capture.status === "pending") {
    return { ok: false, reason: "already_pending" };
  }
  if (opts.capture.status === "confirmed" || opts.capture.status === "timeout") {
    return { ok: false, reason: "invalid" };
  }
  const path = opts.photoStoragePath.trim();
  const uid = opts.submittedByUid.trim();
  if (!path || !uid) {
    return { ok: false, reason: "invalid" };
  }
  return {
    ok: true,
    capture: {
      status: "pending",
      attackingTeamId: opts.attackingTeamId,
      submittedByUid: uid,
      photoStoragePath: path,
      submittedAtMs: opts.nowMs,
      confirmDeadlineMs: opts.nowMs + CAPTURE_CONFIRM_TIMEOUT_MS,
      resolvedAtMs: null,
      resolvedByUid: null,
    },
  };
}

export function confirmSiegeCapture(opts: {
  capture: SiegeCaptureState;
  nowMs: number;
  resolvedByUid: string;
}): { ok: true; capture: SiegeCaptureState } | { ok: false; reason: CaptureFailReason } {
  if (opts.capture.status !== "pending") {
    return { ok: false, reason: "not_pending" };
  }
  const uid = opts.resolvedByUid.trim();
  if (!uid) {
    return { ok: false, reason: "invalid" };
  }
  return {
    ok: true,
    capture: {
      ...opts.capture,
      status: "confirmed",
      resolvedAtMs: opts.nowMs,
      resolvedByUid: uid,
    },
  };
}

export function resolveSiegeCaptureTimeout(
  capture: SiegeCaptureState,
  nowMs: number,
): { ok: true; capture: SiegeCaptureState } | { ok: false; reason: CaptureFailReason } {
  if (capture.status !== "pending" || capture.confirmDeadlineMs === null) {
    return { ok: false, reason: "not_pending" };
  }
  if (nowMs < capture.confirmDeadlineMs) {
    return { ok: false, reason: "invalid" };
  }
  return {
    ok: true,
    capture: {
      ...capture,
      status: "timeout",
      resolvedAtMs: nowMs,
      resolvedByUid: null,
    },
  };
}

/** Dispute → mutual pause; referee/host resolves offline (7A). */
export function disputeSiegeCapture(opts: {
  capture: SiegeCaptureState;
  clock: SiegeClockState;
  nowMs: number;
  resolvedByUid: string;
}):
  | { ok: true; capture: SiegeCaptureState; clock: SiegeClockState }
  | { ok: false; reason: CaptureFailReason } {
  if (opts.capture.status !== "pending") {
    return { ok: false, reason: "not_pending" };
  }
  const uid = opts.resolvedByUid.trim();
  if (!uid) {
    return { ok: false, reason: "invalid" };
  }
  return {
    ok: true,
    capture: {
      ...opts.capture,
      status: "disputed",
      resolvedAtMs: opts.nowMs,
      resolvedByUid: uid,
    },
    clock: pauseSiegeClock(opts.clock, opts.nowMs, "dispute"),
  };
}
