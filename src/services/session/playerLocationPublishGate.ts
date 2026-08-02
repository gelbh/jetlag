/** Blocks Firestore live-location publishes during Leave teardown.
 * Invariant: every `blockPlayerLocationPublishes()` must be paired with
 * `allowPlayerLocationPublishes()` (see `sessionExit` finally, and leave
 * early-return paths) or later sessions silently skip location writes.
 */
let publishesBlocked = false;

export function blockPlayerLocationPublishes(): void {
  publishesBlocked = true;
}

export function allowPlayerLocationPublishes(): void {
  publishesBlocked = false;
}

export function arePlayerLocationPublishesBlocked(): boolean {
  return publishesBlocked;
}

/** @internal */
export function resetPlayerLocationPublishGateForTests(): void {
  publishesBlocked = false;
}
