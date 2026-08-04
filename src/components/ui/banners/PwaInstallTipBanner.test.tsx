import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PwaInstallTipBanner } from "./PwaInstallTipBanner";
import { PWA_INSTALL_TIP_DISMISS_KEY } from "@/domain/device/pwa/pwaInstallTipStorage";

vi.mock("../../../domain/device/pwa/isStandalonePwa", () => ({
  isStandalonePwa: vi.fn(() => false),
}));

vi.mock("../../../domain/device/pwa/detectMobilePlatform", () => ({
  isIosDevice: vi.fn(() => true),
  isAndroidDevice: vi.fn(() => false),
}));

vi.mock("../../../hooks/pwa/usePwaDeferredInstallPrompt", () => ({
  usePwaDeferredInstallPrompt: vi.fn(() => ({
    canDeferredPrompt: false,
    promptInstall: vi.fn(),
  })),
}));

describe("PwaInstallTipBanner", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows iOS add to home screen guidance when not standalone", () => {
    render(<PwaInstallTipBanner />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Add to Home Screen")).toBeInTheDocument();
    expect(
      screen.getByText(/Tap Share, then Add to Home Screen/i),
    ).toBeInTheDocument();
  });

  it("persists dismiss when Not now is tapped", () => {
    render(<PwaInstallTipBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Not now" }));

    expect(localStorage.getItem(PWA_INSTALL_TIP_DISMISS_KEY)).toBe("1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides when tip was previously dismissed", () => {
    localStorage.setItem(PWA_INSTALL_TIP_DISMISS_KEY, "1");

    render(<PwaInstallTipBanner />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
