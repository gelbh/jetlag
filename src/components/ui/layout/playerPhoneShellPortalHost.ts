type PortalHostListener = (host: HTMLElement | null) => void;

let portalHost: HTMLElement | null = null;
const listeners = new Set<PortalHostListener>();

/** Upward bridge: AppUiProvider sits above the router shell. */
export function setPlayerPhoneShellPortalHost(host: HTMLElement | null): void {
  portalHost = host;
  for (const listener of listeners) {
    listener(portalHost);
  }
}

export function getPlayerPhoneShellPortalHost(): HTMLElement | null {
  return portalHost;
}

export function subscribePlayerPhoneShellPortalHost(
  listener: PortalHostListener,
): () => void {
  listeners.add(listener);
  listener(portalHost);
  return () => {
    listeners.delete(listener);
  };
}
