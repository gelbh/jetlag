/** Session callable wiring — re-exports preserve `functions/index.mjs` names. */

export {
  answerCastleSiegeOracleAsk,
  declareCastleSiege,
  recomputeCastleSiegePressure,
} from "./session/castleSiegeOracleCallables.mjs";
export {
  continueCastleSiegeSeries,
  resolveCastleSiegeGame,
} from "./session/castleSiegeSeriesCallables.mjs";
export {
  cancelRoleJoinRequest,
  requestRoleJoin,
  resolveRoleJoinRequest,
} from "./session/joinRequestCallables.mjs";
export {
  endSession,
  initSessionRoleGates,
  joinSessionWithRole,
  leaveHostSession,
  leaveSessionMembership,
  repairGhostHost,
  resetSessionForRematch,
} from "./session/membershipCallables.mjs";
export {
  regenerateRolePasscode,
  revealRolePasscode,
} from "./session/rolePasscodeCallables.mjs";
export { controlSessionTimerForMove } from "./session/timerCallables.mjs";
