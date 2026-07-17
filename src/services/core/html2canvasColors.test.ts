import { afterEach, describe, expect, it, vi } from "vitest";
import { forceRgbCssColorsInClone } from "./html2canvasColors";

describe("forceRgbCssColorsInClone", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rewrites non-rgb computed colors via canvas fillStyle serialization", () => {
    const fillStyleWrites: string[] = [];
    let fillStyleValue = "#000000";
    const probe = {
      get fillStyle() {
        return fillStyleValue;
      },
      set fillStyle(next: string) {
        fillStyleWrites.push(next);
        fillStyleValue = next.startsWith("oklch") ? "rgb(30, 36, 56)" : next;
      },
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      probe as unknown as CanvasRenderingContext2D,
    );

    const root = document.createElement("div");
    document.body.appendChild(root);
    const child = document.createElement("span");
    child.style.backgroundColor = "oklch(0.16 0.045 265)";
    root.appendChild(child);

    vi.spyOn(window, "getComputedStyle").mockImplementation((el) => {
      if (el === child) {
        return {
          backgroundColor: "oklch(0.16 0.045 265)",
          color: "rgb(1, 2, 3)",
          borderTopColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: "transparent",
          borderLeftColor: "transparent",
          outlineColor: "transparent",
        } as CSSStyleDeclaration;
      }
      return {
        backgroundColor: "rgb(0, 0, 0)",
        color: "rgb(0, 0, 0)",
        borderTopColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: "transparent",
        borderLeftColor: "transparent",
        outlineColor: "transparent",
      } as CSSStyleDeclaration;
    });

    forceRgbCssColorsInClone(root);

    expect(child.style.backgroundColor).toBe("rgb(30, 36, 56)");
    expect(fillStyleWrites).toContain("oklch(0.16 0.045 265)");
    root.remove();
  });
});
