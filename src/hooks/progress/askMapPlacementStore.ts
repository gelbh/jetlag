const listeners = new Set<() => void>();
let active = false;

export function subscribeAskMapPlacement(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAskMapPlacementActive(): boolean {
  return active;
}

export function setAskMapPlacementActive(next: boolean): void {
  if (active === next) {
    return;
  }
  active = next;
  for (const listener of listeners) {
    listener();
  }
}

export function resetAskMapPlacementStoreForTests(): void {
  setAskMapPlacementActive(false);
}
