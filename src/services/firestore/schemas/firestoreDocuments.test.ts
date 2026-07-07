import { describe, expect, it } from "vitest";
import {
  annotationDocumentSchema,
  pendingQuestionDocumentSchema,
  sessionDocumentSchema,
} from "./firestoreDocuments";

const sampleGameArea = {
  south: 53.3,
  west: -6.3,
  north: 53.4,
  east: -6.2,
};

describe("firestore document schemas", () => {
  it("accepts a minimal session document", () => {
    const parsed = sessionDocumentSchema.parse({
      code: "ABCD",
      gameArea: sampleGameArea,
      createdAt: "2026-05-14T00:00:00.000Z",
      memberUids: ["host-uid"],
      status: "active",
    });

    expect(parsed.code).toBe("ABCD");
  });

  it("rejects a session document without a game area", () => {
    expect(() =>
      sessionDocumentSchema.parse({
        code: "ABCD",
        createdAt: "2026-05-14T00:00:00.000Z",
      }),
    ).toThrow();
  });

  it("accepts annotation documents with geometry json", () => {
    const parsed = annotationDocumentSchema.parse({
      type: "zone",
      geometryJson: '{"type":"Feature","geometry":{"type":"Polygon","coordinates":[]},"properties":{}}',
    });

    expect(parsed.type).toBe("zone");
  });

  it("accepts pending question documents", () => {
    const parsed = pendingQuestionDocumentSchema.parse({
      toolType: "matching",
      status: "pending",
      placement: {
        geometryJson: "{}",
        metadata: {},
      },
      replyOptions: [],
      promptText: "Same category?",
    });

    expect(parsed.toolType).toBe("matching");
  });
});
