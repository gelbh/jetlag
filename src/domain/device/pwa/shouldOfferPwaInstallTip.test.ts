import { describe, expect, it } from "vitest";
import { shouldOfferPwaInstallTip } from "./shouldOfferPwaInstallTip";

describe("shouldOfferPwaInstallTip", () => {
  it("hides tip when already standalone", () => {
    expect(
      shouldOfferPwaInstallTip({
        standalone: true,
        isIos: true,
        isAndroid: false,
        canDeferredPrompt: false,
      }),
    ).toBe(false);
  });

  it("shows on iOS Safari when not standalone", () => {
    expect(
      shouldOfferPwaInstallTip({
        standalone: false,
        isIos: true,
        isAndroid: false,
        canDeferredPrompt: false,
      }),
    ).toBe(true);
  });

  it("shows on Android when deferred install is available", () => {
    expect(
      shouldOfferPwaInstallTip({
        standalone: false,
        isIos: false,
        isAndroid: true,
        canDeferredPrompt: true,
      }),
    ).toBe(true);
  });

  it("shows on Android without deferred prompt for generic install hint", () => {
    expect(
      shouldOfferPwaInstallTip({
        standalone: false,
        isIos: false,
        isAndroid: true,
        canDeferredPrompt: false,
      }),
    ).toBe(true);
  });

  it("hides on desktop without deferred prompt", () => {
    expect(
      shouldOfferPwaInstallTip({
        standalone: false,
        isIos: false,
        isAndroid: false,
        canDeferredPrompt: false,
      }),
    ).toBe(false);
  });
});
