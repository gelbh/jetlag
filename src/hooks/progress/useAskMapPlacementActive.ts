import { useSyncExternalStore } from "react";

const getSnapshot = () =>
  typeof document !== "undefined" &&
  document.documentElement.hasAttribute("data-ask-map-placement");

const getServerSnapshot = () => false;

function subscribe(listener: () => void) {
  if (typeof document === "undefined") {
    return () => {};
  }

  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-ask-map-placement"],
  });
  return () => observer.disconnect();
}

export function useAskMapPlacementActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
