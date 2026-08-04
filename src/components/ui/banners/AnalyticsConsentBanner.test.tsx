import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AnalyticsConsentBanner } from "./AnalyticsConsentBanner";
import {
  ANALYTICS_CONSENT_KEY,
  writeAnalyticsConsent,
} from "@/domain/device/consent/analyticsConsent";
import { resetAnalyticsForTests } from "@/services/core/analytics/analytics";

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

describe("AnalyticsConsentBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    resetAnalyticsForTests();
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
    resetAnalyticsForTests();
  });

  it("shows Accept and Decline when consent is unset in production", () => {
    render(
      <MemoryRouter>
        <AnalyticsConsentBanner />
      </MemoryRouter>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  it("hides when consent is already set", () => {
    writeAnalyticsConsent("granted");

    render(
      <MemoryRouter>
        <AnalyticsConsentBanner />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides when consent was previously denied", () => {
    writeAnalyticsConsent("denied");

    render(
      <MemoryRouter>
        <AnalyticsConsentBanner />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides outside production", () => {
    vi.stubEnv("PROD", false);

    render(
      <MemoryRouter>
        <AnalyticsConsentBanner />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stores denied and dismisses on Decline", () => {
    render(
      <MemoryRouter>
        <AnalyticsConsentBanner />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));

    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("denied");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stores granted and dismisses on Accept", () => {
    render(
      <MemoryRouter>
        <AnalyticsConsentBanner />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("granted");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
