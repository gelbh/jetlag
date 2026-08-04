import { FirebaseError } from "firebase/app";
import {
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import type {
  GameArea,
  SessionRecord,
  SessionTier,
} from "../../../domain/map/annotations";
import { hidingZoneRadiusMeters, type GameSize } from "../../../domain/session/size/gameSize";
import type { SessionRulesPatch } from "../../../domain/session/tools/advancedSessionSettings";
import {
  resolvePlayerRole,
  type PlayerRole,
} from "../../../domain/session/players/playerRole";
import { timerStateToRemote, type TimerState } from "../../../domain/session/timer/timer";
import {
  sessionVersionCompatible,
  sessionVersionMismatchMessage,
} from "../../../domain/session/meta/sessionVersion";
import { APP_VERSION } from "../../../domain/device/changelog";
import { clientEnvUsesFirebaseEmulator } from "../../../config/env";
import { getFirestoreDb } from "../../core/firebase/firebase";
import { forceRefreshIdToken } from "../../core/auth/forceRefreshIdToken";
import { reportJoinPermissionDenied } from "../../core/analytics/sentry";
import {
  buildSessionDocument,
  deserializeSessionFromFirestore,
  parseEndGameTruthAnchors,
  sessionRulesPatchToFirestore,
} from "../serialization/serializeSession";
import { buildJoinPreviewSession } from "../../../domain/session/join/joinPreviewSession";
import { photoUploadAccessError } from "../../../domain/questions";
import { generateSessionCode } from "../../session/sessionCodes";
import {
  cancelOpenPendingQuestions,
  cancelWalkingThermometersAfterIdentityHeal,
  postGameSystemMessage,
} from "../firestoreSessionExtras";
import { emitGameEndedActivity } from "../../session/emitSessionActivity";
import {
  buildMemberUidsAfterHeal,
  buildMembershipHealState,
  sanitizeReturningMemberUid,
} from "../../../domain/session/players/returningMember";
import { isSessionRoleGated, buildRoleGatesForHost } from "../../../domain/session/players/roleGates";
import { repairGhostHost } from "../../session/sessionLifecycle";
import { initSessionRoleGates } from "../../session/rolePasscodeLifecycle";
import { joinGatedRemoteSessionByCode } from "../joinGatedRemoteSession";

import {
  sessionsCollection,
  endGameTruthAnchorsDoc,
  clearEndGameTruthAnchorsDoc,
  sessionCodeDoc,
  rollbackCreatedRemoteSession,
  annotationsCollection,
  withJoinPermissionRetry,
  readSessionMembershipFields,
  membershipPatchFromHealState,
  writeSessionMembershipPatch,
  applyReturningMemberHealWrite,
  sanitizeJoinReturningMemberUid,
  readSessionCodeRecord,
  mapJoinFailureToError,
  isReclaimableSessionForCode,
  isFirestorePermissionDenied,
  JOIN_AUTH_FAILURE_MESSAGE,
  HIDER_ROLE_POLL_MS,
  HIDER_ROLE_POLL_MAX_MS,
  FIRESTORE_BATCH_LIMIT,
} from "./shared";

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

