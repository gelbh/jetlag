/** Server message substrings for join failures. Shared by the player-copy mapper and the join_failed reason map. */
export const JOIN_ERROR_MARKERS = {
  wrongRoleCode: "Wrong role code",
  roleCodeRequired: "Role code is required",
  versionIncompatible: "App version incompatible",
  clientUpdateRequired: "Client update required.",
  sessionEnded: "Session already ended",
  legacyJoin: "legacy join",
  healRoleMismatch: "Rejoin in your previous role",
  healProofInvalid: "Heal proof invalid",
} as const;
