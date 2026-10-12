import { useEffect, useSyncExternalStore } from "react";

let adminScopes = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useColorSchemeScope(): "admin" | null {
  return useSyncExternalStore(
    subscribe,
    () => (adminScopes > 0 ? "admin" : null),
    () => null,
  );
}

// Pairs with `color-scheme: light dark` on `[data-admin-world]`, or tokens stay dark while Mantine goes light.
export function useAdminColorSchemeScope(): void {
  useEffect(() => {
    adminScopes += 1;
    emit();
    return () => {
      adminScopes -= 1;
      emit();
    };
  }, []);
}
