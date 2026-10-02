/** Public session Firestore API — split by concern under ./sessions/. */

export {
  ensureHiderPhotoUploadAccess,
  getRemoteSessionById,
  getRemoteSessionByIdFromServer,
  type JoinRemoteSessionResult,
  joinRemoteSessionByCode,
  lookupRemoteSessionByCode,
  waitForServerHiderRole,
} from "./sessions/join";
export {
  clearEndGameRequestSession,
  confirmFoundHiderSession,
  endRemoteSession,
  requestFoundHiderSession,
  resetEndGameSession,
  resetFoundHiderSession,
  resetRemoteSession,
  startEndGameSession,
  updateSessionRules,
  updateSessionTimer,
} from "./sessions/lifecycle";
export { handleFirestoreListenError } from "./sessions/listenError";
export {
  createRemoteSession,
  type EnsureRemoteSessionMembershipOptions,
  ensureRemoteSessionMembership,
  ensureRemoteSessionWriteAccess,
} from "./sessions/membership";
export {
  isFirestorePermissionDenied,
  isReclaimableSessionForCode,
  JOIN_AUTH_FAILURE_MESSAGE,
  touchSessionLastActive,
} from "./sessions/shared";
export {
  subscribeToEndGameTruthAnchors,
  subscribeToSession,
} from "./sessions/subscribe";
