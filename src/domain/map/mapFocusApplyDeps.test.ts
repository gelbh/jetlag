import { describe, expect, it } from "vitest";
import { mapFocusApplyDependencyKeys } from "./mapFocusApplyDeps";

const boxA: [[number, number], [number, number]] = [
  [53.34, -6.27],
  [53.36, -6.25],
];
const boxB: [[number, number], [number, number]] = [
  [53.35, -6.26],
  [53.37, -6.24],
];

describe("mapFocusApplyDependencyKeys", () => {
  it("once-mode ignores bounds identity and preferFly-class inputs", () => {
    const base = {
      fitBoundsMode: "once" as const,
      animate: true,
      focusBounds: boxA,
      focusPaddingBias: 100,
      focusMaxZoom: 16,
      focusMinZoom: 10,
      padX: 32,
      padY: 32,
      recenterToken: 1,
    };

    const a = mapFocusApplyDependencyKeys(base);
    const b = mapFocusApplyDependencyKeys({
      ...base,
      focusBounds: boxB,
      focusPaddingBias: 400,
      focusMaxZoom: 18,
      focusMinZoom: 8,
    });

    expect(a).toEqual(b);
    expect(a).toContain(true); // bounds present
    expect(a).not.toContain(boxA);
    expect(a).not.toContain(boxB);
  });

  it("once-mode re-enters when bounds presence or token changes", () => {
    const withBounds = mapFocusApplyDependencyKeys({
      fitBoundsMode: "once",
      animate: true,
      focusBounds: boxA,
      padX: 32,
      padY: 32,
      recenterToken: 1,
    });
    const withoutBounds = mapFocusApplyDependencyKeys({
      fitBoundsMode: "once",
      animate: true,
      focusBounds: null,
      padX: 32,
      padY: 32,
      recenterToken: 1,
    });
    const nextToken = mapFocusApplyDependencyKeys({
      fitBoundsMode: "once",
      animate: true,
      focusBounds: boxA,
      padX: 32,
      padY: 32,
      recenterToken: 2,
    });

    expect(withBounds).not.toEqual(withoutBounds);
    expect(withBounds).not.toEqual(nextToken);
  });

  it("always-mode tracks live bounds identity", () => {
    const a = mapFocusApplyDependencyKeys({
      fitBoundsMode: "always",
      animate: true,
      focusBounds: boxA,
      padX: 32,
      padY: 32,
      recenterToken: 0,
    });
    const b = mapFocusApplyDependencyKeys({
      fitBoundsMode: "always",
      animate: true,
      focusBounds: boxB,
      padX: 32,
      padY: 32,
      recenterToken: 0,
    });

    expect(a).not.toEqual(b);
    expect(a).toContain(boxA);
  });
});
