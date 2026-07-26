import { afterEach, describe, expect, it, vi } from "vitest";
import { forceRgbCssColorsInClone } from "./html2canvasColors";

function styleStub(
  backgroundColor: string,
): Pick<
  CSSStyleDeclaration,
  | "backgroundColor"
  | "color"
  | "borderTopColor"
  | "borderRightColor"
  | "borderBottomColor"
  | "borderLeftColor"
  | "outlineColor"
> {
  return {
    backgroundColor,
    color: "rgb(1, 2, 3)",
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
    outlineColor: "transparent",
  };
}

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

    const outside = document.createElement("div");
    outside.style.backgroundColor = "oklch(0.5 0.1 100)";
    document.body.appendChild(outside);

    vi.spyOn(window, "getComputedStyle").mockImplementation((el) => {
      if (el === child) {
        return styleStub("oklch(0.16 0.045 265)") as CSSStyleDeclaration;
      }
      if (el === outside) {
        return styleStub("oklch(0.5 0.1 100)") as CSSStyleDeclaration;
      }
      return styleStub("rgb(0, 0, 0)") as CSSStyleDeclaration;
    });

    forceRgbCssColorsInClone(root);

    expect(child.style.backgroundColor).toBe("rgb(30, 36, 56)");
    expect(outside.style.backgroundColor).toBe("oklch(0.5 0.1 100)");
    expect(fillStyleWrites).toContain("oklch(0.16 0.045 265)");
    root.remove();
    outside.remove();
  });

  it("no-ops when canvas 2d context is unavailable", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    const root = document.createElement("div");
    root.style.backgroundColor = "oklch(0.16 0.045 265)";
    document.body.appendChild(root);

    expect(() => forceRgbCssColorsInClone(root)).not.toThrow();
    expect(root.style.backgroundColor).toBe("oklch(0.16 0.045 265)");
    root.remove();
  });
});
