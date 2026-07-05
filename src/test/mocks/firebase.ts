import { vi } from "vitest";

export function createFirebaseMocks() {
  return {
    ensureAnonymousUser: vi.fn(async () => ({ uid: "test-user" })),
    isFirebaseConfigured: vi.fn(() => false),
    getFirestoreDb: vi.fn(),
    getFirebaseAuth: vi.fn(),
  };
}
