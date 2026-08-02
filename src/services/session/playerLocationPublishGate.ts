/** Blocks Firestore live-location publishes during Leave teardown. */
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
