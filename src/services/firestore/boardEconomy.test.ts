import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";

const onSnapshot = vi.hoisted(() => vi.fn());
const handleFirestoreListenError = vi.hoisted(() => vi.fn());

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({ path: "sessions/s1/boardEconomy/state" })),
  getDoc: vi.fn(),
  onSnapshot,
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock("../core/firebase/firebase", () => ({
  getFirestoreDb: vi.fn(() => ({})),
}));

vi.mock("./sessions/listenError", () => ({
  handleFirestoreListenError,
}));

import { subscribeBoardEconomyState } from "./boardEconomy";

describe("subscribeBoardEconomyState", () => {
  beforeEach(() => {
    onSnapshot.mockReset();
    handleFirestoreListenError.mockReset();
    onSnapshot.mockImplementation(() => vi.fn());
  });

  it("registers an onSnapshot error handler that uses shared listen error path", () => {
    const onChange = vi.fn();
    const onError = vi.fn();
    subscribeBoardEconomyState("session-1", onChange, onError);

    expect(onSnapshot).toHaveBeenCalledOnce();
    const errorHandler = onSnapshot.mock.calls[0]?.[2] as
      | ((error: Error) => void)
      | undefined;
    expect(errorHandler).toEqual(expect.any(Function));

    const boom = new FirebaseError(
      "permission-denied",
      "Missing or insufficient permissions.",
    );
    errorHandler?.(boom);

    expect(handleFirestoreListenError).toHaveBeenCalledExactlyOnceWith(
      boom,
      onError,
    );
  });
});
