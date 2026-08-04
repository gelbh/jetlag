/** Public session Firestore API — split by concern under ./sessions/. */
export {
  isReclaimableSessionForCode,
  isFirestorePermissionDenied,
  JOIN_AUTH_FAILURE_MESSAGE,
} from "./sessions/shared";
export {
  ensureRemoteSessionMembership,
  ensureRemoteSessionWriteAccess,
  createRemoteSession,
  type EnsureRemoteSessionMembershipOptions,
} from "./sessions/membership";
export {
  lookupRemoteSessionByCode,
  joinRemoteSessionByCode,
  getRemoteSessionById,
  getRemoteSessionByIdFromServer,
  waitForServerHiderRole,
  ensureHiderPhotoUploadAccess,
  type JoinRemoteSessionResult,
} from "./sessions/join";
export {
  endRemoteSession,
  updateSessionTimer,
  updateSessionRules,
  startEndGameSession,
  touchSessionLastActive,
  clearEndGameRequestSession,
  resetEndGameSession,
  requestFoundHiderSession,
  confirmFoundHiderSession,
  resetFoundHiderSession,
  resetRemoteSession,
} from "./sessions/lifecycle";
export {
  subscribeToSession,
  subscribeToEndGameTruthAnchors,
} from "./sessions/subscribe";
