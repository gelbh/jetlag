import { describe, expect, it } from "vitest";
import { isHtml2CanvasUnsupportedColorMessage } from "./html2canvasErrors";

describe("isHtml2CanvasUnsupportedColorMessage", () => {
  it("matches html2canvas oklch parse errors", () => {
    expect(
      isHtml2CanvasUnsupportedColorMessage(
        'Attempting to parse an unsupported color function "oklch"',
      ),
    ).toBe(true);
  });

  it("ignores unrelated messages", () => {
    expect(
      isHtml2CanvasUnsupportedColorMessage("Failed to execute 'transaction'"),
    ).toBe(false);
  });
});
