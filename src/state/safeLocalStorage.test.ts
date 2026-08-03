import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSafeLocalStorage,
  dropDeletedAnnotations,
  isQuotaExceededError,
  keepSessionAnnotations,
  safeSetItemForAnnotations,
} from "./safeLocalStorage";
import { createTestPinAnnotation } from "../test/fixtures/sessions";
import { LOCAL_SESSION_ID } from "../domain/map/annotations";

function quotaError(): DOMException {
  return new DOMException("QuotaExceededError", "QuotaExceededError");
}

function annotationsPayload(
  annotations: ReturnType<typeof createTestPinAnnotation>[],
): string {
  return JSON.stringify({ state: { annotations }, version: 0 });
}

describe("safeLocalStorage", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("detects QuotaExceededError variants", () => {
    expect(isQuotaExceededError(quotaError())).toBe(true);
    expect(isQuotaExceededError(new Error("QuotaExceededError"))).toBe(true);
    expect(isQuotaExceededError(new Error("The quota has been exceeded."))).toBe(
      true,
    );
    expect(isQuotaExceededError(new Error("Network failed"))).toBe(false);
  });

  it("drops deleted annotations from persisted payload", () => {
    const active = createTestPinAnnotation({ id: "ann-active" });
    const deleted = createTestPinAnnotation({
      id: "ann-deleted",
      status: "deleted",
    });
    const value = annotationsPayload([active, deleted]);

    const pruned = dropDeletedAnnotations(value);
    const parsed = JSON.parse(pruned) as {
      state: { annotations: { id: string; status: string }[] };
    };

    expect(parsed.state.annotations).toEqual([
      expect.objectContaining({ id: "ann-active", status: "active" }),
    ]);
  });

  it("keeps only annotations for the current session", () => {
    localStorage.setItem(
      "jetlag-session",
      JSON.stringify({
        state: { session: { id: LOCAL_SESSION_ID } },
        version: 0,
      }),
    );

    const current = createTestPinAnnotation({
      id: "ann-current",
      sessionId: LOCAL_SESSION_ID,
    });
    const other = createTestPinAnnotation({
      id: "ann-other",
      sessionId: "other-session",
    });
    const value = annotationsPayload([current, other]);

    const pruned = keepSessionAnnotations(value);
    const parsed = JSON.parse(pruned) as {
      state: { annotations: { id: string }[] };
    };

    expect(parsed.state.annotations.map((annotation) => annotation.id)).toEqual([
      "ann-current",
    ]);
  });

  it("retries after pruning deleted annotations when quota is exceeded", () => {
    const active = createTestPinAnnotation({ id: "ann-active" });
    const deleted = createTestPinAnnotation({
      id: "ann-deleted",
      status: "deleted",
    });
    const value = annotationsPayload([active, deleted]);

    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(function mockSetItem(this: Storage, key, payload) {
        if (key !== "jetlag-annotations") {
          return Storage.prototype.setItem.call(this, key, payload);
        }

        const parsed = JSON.parse(payload) as {
          state: { annotations: { status: string }[] };
        };
        if (parsed.state.annotations.some((item) => item.status === "deleted")) {
          throw quotaError();
        }
      });

    safeSetItemForAnnotations(localStorage, "jetlag-annotations", value);

    expect(setItem).toHaveBeenCalledTimes(2);
    const retryPayload = setItem.mock.calls[1]?.[1] as string;
    const retryParsed = JSON.parse(retryPayload) as {
      state: { annotations: { id: string; status: string }[] };
    };
    expect(retryParsed.state.annotations).toEqual([
      expect.objectContaining({ id: "ann-active", status: "active" }),
    ]);
  });

  it("clears storage when quota persists after pruning", () => {
    const value = annotationsPayload([
      createTestPinAnnotation({ id: "ann-only", status: "active" }),
    ]);

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError();
    });
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");

    safeSetItemForAnnotations(localStorage, "jetlag-annotations", value);

    expect(removeItem).toHaveBeenCalledWith("jetlag-annotations");
  });

  it("routes annotation writes through safe setItem", () => {
    const safeStorage = createSafeLocalStorage(localStorage);
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(function mockSetItem(this: Storage, key, payload) {
        if (key !== "jetlag-annotations") {
          return Storage.prototype.setItem.call(this, key, payload);
        }

        const parsed = JSON.parse(payload) as {
          state: { annotations: { status: string }[] };
        };
        if (parsed.state.annotations.some((item) => item.status === "deleted")) {
          throw quotaError();
        }
      });

    const active = createTestPinAnnotation({ id: "ann-active" });
    const deleted = createTestPinAnnotation({
      id: "ann-deleted",
      status: "deleted",
    });
    const value = annotationsPayload([active, deleted]);

    expect(() =>
      safeStorage.setItem("jetlag-annotations", value),
    ).not.toThrow();
    expect(setItem).toHaveBeenCalledTimes(2);
  });
});
