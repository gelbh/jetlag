import { describe, expect, it } from "vitest";
import {
  buildSessionDocument,
  deserializeGameResultFromFirestore,
  serializeAnnotationForFirestore,
} from "./firestoreSerialization";

describe("firestoreSerialization barrel", () => {
  it("re-exports session, annotation, and player serializers", () => {
    expect(typeof buildSessionDocument).toBe("function");
    expect(typeof serializeAnnotationForFirestore).toBe("function");
    expect(typeof deserializeGameResultFromFirestore).toBe("function");
  });
});
