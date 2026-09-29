import { describe, expect, it, vi } from "vitest";
import { onSnapshot } from "firebase/firestore";
import { subscribeToSession } from "./subscribe";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  onSnapshot: vi.fn(() => vi.fn()),
}));
vi.mock("./shared", () => ({
  sessionsCollection: vi.fn(() => ({})),
  endGameTruthAnchorsDoc: vi.fn(),
}));
vi.mock("../serialization/serializeSession", () => ({
  deserializeSessionFromFirestore: vi.fn((id: string) => ({ id })),
  parseEndGameTruthAnchors: vi.fn(),
}));

describe("subscribeToSession", () => {
  it("listens with metadata changes and reports fromCache before data", () => {
    const onChange = vi.fn();
    const onMetadata = vi.fn();
    subscribeToSession("s1", onChange, vi.fn(), onMetadata);

    const call = vi.mocked(onSnapshot).mock.calls[0] as unknown[];
    expect(call[1]).toEqual({ includeMetadataChanges: true });
    const handler = call[2] as (snapshot: unknown) => void;

    handler({
      id: "s1",
      exists: () => true,
      data: () => ({}),
      metadata: { fromCache: true },
    });
    handler({
      id: "s1",
      exists: () => false,
      data: () => undefined,
      metadata: { fromCache: false },
    });

    expect(onMetadata.mock.calls).toEqual([
      [{ fromCache: true }],
      [{ fromCache: false }],
    ]);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
