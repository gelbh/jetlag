import type { ReactNode } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AnalyticsConsentBanner } from "./AnalyticsConsentBanner";
import {
  ANALYTICS_CONSENT_KEY,
  writeAnalyticsConsent,
} from "@/domain/device/consent/analyticsConsent";
import { resetAnalyticsForTests } from "@/services/core/analytics/analytics";
import { resetEmbedModeForTests } from "@/domain/device/embed/embedMode";
import { renderWithAppUi } from "../../../test/renderWithAppUi";

vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
  },
}));

vi.mock("../../navigation/AppLink", () => ({
  AppLink: ({
    to,
    children,
    className,
  }: {
    to: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

function renderBanner() {
  return renderWithAppUi(
    <MemoryRouter>
      <AnalyticsConsentBanner />
    </MemoryRouter>,
  );
}

describe("AnalyticsConsentBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    resetAnalyticsForTests();
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, "", "/");
    resetAnalyticsForTests();
    resetEmbedModeForTests();
  });

  it("stays hidden in embed mode (framed with ?embed=1)", () => {
    vi.spyOn(window, "top", "get").mockReturnValue({} as Window);
    window.history.replaceState(null, "", "/?embed=1");
    const { container } = renderBanner();
    expect(container.querySelector("#analytics-consent-title")).toBeNull();
  });

  it("shows Accept and Decline when consent is unset in production", () => {
    const { container } = renderBanner();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(container.innerHTML).not.toMatch(
      /hud-panel|btn-primary|btn-secondary|map-float-alert/,
    );
  });

  it("hides when consent is already set", () => {
    writeAnalyticsConsent("granted");

    renderBanner();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides when consent was previously denied", () => {
    writeAnalyticsConsent("denied");

    renderBanner();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides outside production", () => {
    vi.stubEnv("PROD", false);

    renderBanner();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stores denied and dismisses on Decline", () => {
    renderBanner();

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));

    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("denied");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stores granted and dismisses on Accept", () => {
    renderBanner();

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("granted");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
