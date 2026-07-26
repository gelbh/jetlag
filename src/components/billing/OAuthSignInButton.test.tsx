import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OAuthSignInButton } from "./OAuthSignInButton";

const { getFirebaseAuth, mockAuth } = vi.hoisted(() => {
  const mockAuth = {
    currentUser: null as { uid: string } | null,
  };
  return {
    mockAuth,
    getFirebaseAuth: vi.fn(() => mockAuth),
  };
});

vi.mock("../../services/core/firebase", () => ({
  getFirebaseAuth,
}));

describe("OAuthSignInButton", () => {
  beforeEach(() => {
    mockAuth.currentUser = { uid: "anon-1" };
  });

  it("does not await ensureAnonymousUser before opening the provider popup", async () => {
    const onSignIn = vi.fn(async () => undefined);
    const onSuccess = vi.fn(async () => undefined);
    const onError = vi.fn();

    render(
      <OAuthSignInButton
        provider="google"
        onSignIn={onSignIn}
        onSuccess={onSuccess}
        onError={onError}
        label="Continue with Google"
        icon={<span>G</span>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/i }));

    await waitFor(() => {
      expect(onSignIn).toHaveBeenCalledOnce();
    });
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it("errors when auth currentUser is missing instead of awaiting mint", async () => {
    mockAuth.currentUser = null;
    const onSignIn = vi.fn(async () => undefined);
    const onError = vi.fn();

    render(
      <OAuthSignInButton
        provider="google"
        onSignIn={onSignIn}
        onSuccess={vi.fn()}
        onError={onError}
        label="Continue with Google"
        icon={<span>G</span>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.stringMatching(/isn’t ready yet/i),
      );
    });
    expect(onSignIn).not.toHaveBeenCalled();
  });
});
