import { describe, expect, it } from "vitest";
import { matchingAnswerFromReplyId } from "./matching";
import { radarAnswerFromReplyId } from "./radar";
import { thermometerAnswerFromReplyId } from "./thermometer";

describe("questionResolution reply parsers", () => {
  it("parses yes/no matching and radar replies", () => {
    expect(matchingAnswerFromReplyId("yes")).toBe("yes");
    expect(matchingAnswerFromReplyId("no")).toBe("no");
    expect(matchingAnswerFromReplyId("maybe")).toBeNull();
    expect(radarAnswerFromReplyId("yes")).toBe("yes");
    expect(radarAnswerFromReplyId("invalid")).toBeNull();
  });

  it("parses thermometer hotter/colder replies", () => {
    expect(thermometerAnswerFromReplyId("hotter")).toBe("hotter");
    expect(thermometerAnswerFromReplyId("colder")).toBe("colder");
    expect(thermometerAnswerFromReplyId("warm")).toBeNull();
  });
});
