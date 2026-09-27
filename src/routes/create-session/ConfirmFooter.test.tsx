import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmFooter } from "./ConfirmFooter";

const baseProps = {
  confirmLabel: "Confirm game area",
  loading: false,
  verifyingAccess: false,
  requiresPremiumSignIn: false,
  hostAuthReady: true,
  error: null as string | null,
  onConfirm: vi.fn(),
};

describe("ConfirmFooter", () => {
  it("disables confirm until host auth is ready", () => {
    const { rerender } = render(<ConfirmFooter {...baseProps} hostAuthReady={false} />);

    expect(
      screen.getByRole("button", { name: /confirm game area/i }),
    ).toBeDisabled();

    rerender(<ConfirmFooter {...baseProps} hostAuthReady={true} />);

    expect(
      screen.getByRole("button", { name: /confirm game area/i }),
    ).toBeEnabled();
  });

  it("stays disabled while loading even when host auth is ready", () => {
    render(<ConfirmFooter {...baseProps} loading={true} hostAuthReady={true} />);

    expect(
      screen.getByRole("button", { name: /confirm game area/i }),
    ).toBeDisabled();
  });
});
