import { afterEach, describe, expect, it, vi } from "vitest";

const getStorage = vi.fn(() => ({ bucket: "storage" }));
const getFunctions = vi.fn(() => ({ region: "us-central1" }));

vi.mock("firebase/storage", () => ({
  connectStorageEmulator: vi.fn(),
  getStorage,
}));

vi.mock("firebase/functions", () => ({
  getFunctions,
}));

vi.mock("./firebase", () => ({
  getFirebaseApp: vi.fn(() => ({ name: "app" })),
}));

describe("firebase lazy modules", () => {
  afterEach(async () => {
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
});
