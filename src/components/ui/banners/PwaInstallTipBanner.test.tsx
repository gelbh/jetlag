import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PWA_INSTALL_TIP_DISMISS_KEY } from "@/domain/device/pwa/pwaInstallTipStorage";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { PwaInstallTipBanner } from "./PwaInstallTipBanner";

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
    const { container } = renderWithAppUi(<PwaInstallTipBanner />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Add to Home Screen")).toBeInTheDocument();
    expect(screen.getByText(/Tap Share, then Add to Home Screen/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not now" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/hud-panel|btn-primary|btn-secondary|map-float-alert/);
  });

  it("persists dismiss when Not now is tapped", () => {
    renderWithAppUi(<PwaInstallTipBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Not now" }));

    expect(localStorage.getItem(PWA_INSTALL_TIP_DISMISS_KEY)).toBe("1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides when tip was previously dismissed", () => {
    localStorage.setItem(PWA_INSTALL_TIP_DISMISS_KEY, "1");

    renderWithAppUi(<PwaInstallTipBanner />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
