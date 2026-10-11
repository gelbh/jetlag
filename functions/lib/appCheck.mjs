/**
 * The `demo-` emulator project cannot mint App Check tokens, so enforcing in the emulator
 * rejects every callable as unauthenticated. Deployed functions never see FUNCTIONS_EMULATOR.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
export function resolveEnforceAppCheck(env = process.env) {
  return env.FUNCTIONS_EMULATOR !== "true";
}

export const enforceAppCheck = resolveEnforceAppCheck();
