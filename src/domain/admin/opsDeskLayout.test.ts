import { describe, expect, it } from "vitest";
import { PANEL_IDS } from "./opsDeskLayout";

describe("opsDeskLayout", () => {
  it("exposes five panel ids", () => {
    expect(PANEL_IDS).toEqual(["sessions", "monitor", "inbox", "detail", "actions"]);
  });
});
