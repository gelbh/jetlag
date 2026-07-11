import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Premium } from "./Premium";
import { renderWithRouter } from "../test/renderWithRouter";

const {
  fetchPremiumEntitlements,
  startPremiumCheckout,
  openPremiumBillingPortal,
  ensureAnonymousUser,
  isFirebaseConfigured,
} = vi.hoisted(() => ({
  fetchPremiumEntitlements: vi.fn(),
  startPremiumCheckout: vi.fn(),
  openPremiumBillingPortal: vi.fn(),
  ensureAnonymousUser: vi.fn(async () => undefined),
  isFirebaseConfigured: vi.fn(() => false),
}));

vi.mock("../services/core/firebase", () => ({
  isFirebaseConfigured,
  ensureAnonymousUser,
}));

vi.mock("../services/billing/premiumBilling", () => ({
  fetchPremiumEntitlements,
  startPremiumCheckout,
  openPremiumBillingPortal,
}));

describe("Premium", () => {
  it("shows offline billing message when Firebase is not configured", () => {
    renderWithRouter(<Premium />);

    expect(screen.getByRole("heading", { name: "Premium" })).toBeInTheDocument();
    expect(
      screen.getByText(/Premium billing needs an online connection/i),
    ).toBeInTheDocument();
  });

  it("renders purchase options and entitlement summary when online", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    fetchPremiumEntitlements.mockResolvedValueOnce({
      premiumSessionCredits: 2,
      lifetimePremium: false,
      subscription: null,
      trialUsedAt: null,
      canCreatePremium: true,
      hasUnlimitedPremium: false,
    });

    renderWithRouter(<Premium />);

    await waitFor(() => {
      expect(screen.getByText("2 premium sessions left")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /1 session/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create premium session" }),
    ).toHaveAttribute("href", "/create");
  });

  it("starts checkout when a pack is selected", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    fetchPremiumEntitlements.mockResolvedValueOnce({
      premiumSessionCredits: 0,
      lifetimePremium: false,
      subscription: null,
      trialUsedAt: null,
      canCreatePremium: false,
      hasUnlimitedPremium: false,
    });
    startPremiumCheckout.mockResolvedValueOnce("https://checkout.test");
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: assignSpy },
    });

    renderWithRouter(<Premium />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /3 sessions/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /3 sessions/i }));

    await waitFor(() => {
      expect(startPremiumCheckout).toHaveBeenCalledWith("pack_3", {
        startTrial: false,
      });
      expect(assignSpy).toHaveBeenCalledWith("https://checkout.test");
    });
  });
});
