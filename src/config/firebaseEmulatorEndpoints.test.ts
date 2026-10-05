import { describe, expect, it } from "vitest";
import { FIREBASE_EMULATOR_DEFAULTS, firebaseEmulatorEndpoints } from "./firebaseEmulatorEndpoints";

describe("firebaseEmulatorEndpoints", () => {
  it("uses firebase.json defaults when env is empty", () => {
    expect(firebaseEmulatorEndpoints({})).toEqual({
      host: FIREBASE_EMULATOR_DEFAULTS.host,
      authPort: FIREBASE_EMULATOR_DEFAULTS.auth,
      firestorePort: FIREBASE_EMULATOR_DEFAULTS.firestore,
      storagePort: FIREBASE_EMULATOR_DEFAULTS.storage,
      functionsPort: FIREBASE_EMULATOR_DEFAULTS.functions,
    });
  });

  it("overrides ports and host from VITE_ vars", () => {
    expect(
      firebaseEmulatorEndpoints({
        VITE_FIREBASE_EMULATOR_HOST: "localhost",
        VITE_FIREBASE_AUTH_EMULATOR_PORT: "9200",
        VITE_FIRESTORE_EMULATOR_PORT: "8181",
        VITE_FIREBASE_STORAGE_EMULATOR_PORT: "9197",
        VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT: "5002",
      }),
    ).toEqual({
      host: "localhost",
      authPort: 9200,
      firestorePort: 8181,
      storagePort: 9197,
      functionsPort: 5002,
    });
  });

  it("throws when a set port value is not an integer in range", () => {
    expect(() =>
      firebaseEmulatorEndpoints({
        VITE_FIREBASE_AUTH_EMULATOR_PORT: "nope",
      }),
    ).toThrow(/VITE_FIREBASE_AUTH_EMULATOR_PORT/);

    expect(() =>
      firebaseEmulatorEndpoints({
        VITE_FIRESTORE_EMULATOR_PORT: "0",
      }),
    ).toThrow(/VITE_FIRESTORE_EMULATOR_PORT/);

    expect(() =>
      firebaseEmulatorEndpoints({
        VITE_FIREBASE_STORAGE_EMULATOR_PORT: "65536",
      }),
    ).toThrow(/VITE_FIREBASE_STORAGE_EMULATOR_PORT/);
  });
});
