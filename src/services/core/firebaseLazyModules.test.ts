import { afterEach, describe, expect, it, vi } from "vitest";

const getStorage = vi.fn(() => ({ bucket: "storage" }));
const getFunctions = vi.fn(() => ({ region: "us-central1" }));
const connectFunctionsEmulator = vi.fn();

vi.mock("../../config/env", () => ({
  clientEnvUsesFirebaseEmulator: vi.fn(() => false),
}));

vi.mock("firebase/storage", () => ({
  connectStorageEmulator: vi.fn(),
  getStorage,
}));

vi.mock("firebase/functions", () => ({
  connectFunctionsEmulator,
  getFunctions,
}));

vi.mock("./firebase", () => ({
  getFirebaseApp: vi.fn(() => ({ name: "app" })),
}));

describe("firebase lazy modules", () => {
  afterEach(async () => {
    const { clientEnvUsesFirebaseEmulator } = await import("../../config/env");
    vi.mocked(clientEnvUsesFirebaseEmulator).mockReturnValue(false);
    const { resetFirebaseStorageForTests } = await import("./firebaseStorage");
    const { resetFirebaseFunctionsForTests } = await import(
      "./firebaseFunctions"
    );
    resetFirebaseStorageForTests();
    resetFirebaseFunctionsForTests();
    getStorage.mockClear();
    getFunctions.mockClear();
  });

  it("lazy-loads and caches Firebase storage", async () => {
    const { getFirebaseStorage } = await import("./firebaseStorage");

    const first = await getFirebaseStorage();
    const second = await getFirebaseStorage();

    expect(first).toEqual({ bucket: "storage" });
    expect(second).toBe(first);
    expect(getStorage).toHaveBeenCalledOnce();
  });

  it("lazy-loads and caches Firebase functions", async () => {
    const { getFirebaseFunctions } = await import("./firebaseFunctions");

    const first = await getFirebaseFunctions();
    const second = await getFirebaseFunctions();

    expect(first).toEqual({ region: "us-central1" });
    expect(second).toBe(first);
    expect(getFunctions).toHaveBeenCalledOnce();
  });

  it("connects functions to the emulator when enabled", async () => {
    const { clientEnvUsesFirebaseEmulator } = await import("../../config/env");
    vi.mocked(clientEnvUsesFirebaseEmulator).mockReturnValue(true);

    const { getFirebaseFunctions } = await import("./firebaseFunctions");
    const instance = await getFirebaseFunctions();

    expect(connectFunctionsEmulator).toHaveBeenCalledWith(instance, "127.0.0.1", 5001);
  });
});
