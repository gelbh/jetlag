import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAnnotationStore } from "./annotationStore";
import { createTestPinAnnotation } from "../test/fixtures/sessions";
import { resetAllStores } from "../test/helpers/storeReset";

function quotaError(): DOMException {
  return new DOMException("QuotaExceededError", "QuotaExceededError");
}

describe("annotationStore", () => {
  beforeEach(() => {
    resetAllStores();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds and upserts annotations", () => {
    const created = useAnnotationStore.getState().addAnnotation({
      type: "pin",
      geometry: createTestPinAnnotation().geometry,
      metadata: createTestPinAnnotation().metadata,
    });

    expect(useAnnotationStore.getState().annotations).toHaveLength(1);
    expect(created.id).toBeTruthy();

    useAnnotationStore.getState().upsertAnnotation({
      ...created,
      metadata: { ...created.metadata, label: "Updated" },
    });

    expect(useAnnotationStore.getState().annotations[0]?.metadata.label).toBe(
      "Updated",
    );
  });

  it("soft deletes the most recent active annotation on undo", () => {
    useAnnotationStore.getState().addAnnotation({
      type: "pin",
      geometry: createTestPinAnnotation().geometry,
      metadata: createTestPinAnnotation().metadata,
    });
    const zone = useAnnotationStore.getState().addAnnotation({
      type: "zone",
      geometry: createTestPinAnnotation().geometry,
      metadata: { ...createTestPinAnnotation().metadata, label: "Zone" },
    });

    useAnnotationStore.getState().undoLastAnnotation();
    const deleted = useAnnotationStore
      .getState()
      .annotations.find((item) => item.id === zone.id);
    expect(deleted?.status).toBe("deleted");
  });

  it("tracks redo stack entries", () => {
    useAnnotationStore.getState().pushRedoAnnotationId("ann-1");
    useAnnotationStore.getState().pushRedoAnnotationId("ann-1");
    expect(useAnnotationStore.getState().redoAnnotationIds).toEqual(["ann-1"]);

    useAnnotationStore.getState().removeRedoAnnotationId("ann-1");
    expect(useAnnotationStore.getState().redoAnnotationIds).toEqual([]);
  });

  it("marks pulsing annotations", () => {
    useAnnotationStore.getState().markAnnotationPulse("ann-1");
    expect(useAnnotationStore.getState().pulsingAnnotationIds).toEqual([
      "ann-1",
    ]);
    useAnnotationStore.getState().clearAnnotationPulse("ann-1");
    expect(useAnnotationStore.getState().pulsingAnnotationIds).toEqual([]);
  });

  it("does not throw when persist hits localStorage quota", () => {
    const created = useAnnotationStore.getState().addAnnotation({
      type: "pin",
      geometry: createTestPinAnnotation().geometry,
      metadata: createTestPinAnnotation().metadata,
    });
    useAnnotationStore.getState().softDeleteAnnotation(created.id);

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function mockSetItem(
      this: Storage,
      key,
      value,
    ) {
      if (key !== "jetlag-annotations") {
        return Storage.prototype.setItem.call(this, key, value);
      }

      const parsed = JSON.parse(value) as {
        state: { annotations: { status: string }[] };
      };
      if (parsed.state.annotations.some((item) => item.status === "deleted")) {
        throw quotaError();
      }
    });

    expect(() =>
      useAnnotationStore.getState().setSelectedAnnotationId(created.id),
    ).not.toThrow();
    expect(useAnnotationStore.getState().selectedAnnotationId).toBe(
      created.id,
    );
  });
});
