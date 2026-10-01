/**
 * Count of React `onRecoverableError` calls this page load (hydration mismatches that forced a
 * client re-render). Read by the E2E bridge so smoke tests can assert hydration stayed clean.
 */
let recoverableErrorCount = 0;

export function countRecoverableError(): number {
  recoverableErrorCount += 1;
  return recoverableErrorCount;
}

export function getRecoverableErrorCount(): number {
  return recoverableErrorCount;
}
