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

// ponytail: no caller yet (admin ships dark-only). The PR that calls this must also flip
// `[data-admin-world]` to `color-scheme: light dark`, or tokens stay dark while Mantine goes light.
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
