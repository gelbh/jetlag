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

vi.mock("../../services/core/firebase/firebase", () => ({
  getFirebaseAuth,
}));

describe("OAuthSignInButton", () => {
  beforeEach(() => {
    mockAuth.currentUser = { uid: "anon-1" };
  });

  it("starts the provider popup in the same turn as the click", async () => {
    let resolveSignIn: (() => void) | undefined;
    const onSignInStarted = vi.fn();
    const onSignIn = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          onSignInStarted();
          resolveSignIn = resolve;
        }),
    );
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

    // Gesture preservation: popup path must start before any later microtask work.
    expect(onSignInStarted).toHaveBeenCalledOnce();
    resolveSignIn?.();

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
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
