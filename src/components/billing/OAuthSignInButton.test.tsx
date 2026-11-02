import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  OAUTH_RESUME_TIMEOUT_MESSAGE,
  OAuthRedirectInProgressError,
} from "../../services/core/auth/accountAuth";
import {
  OAUTH_NEVER_HIDDEN_GRACE_MS,
  OAUTH_RESUME_GRACE_MS,
  OAuthSignInButton,
} from "./OAuthSignInButton";

const { getFirebaseAuth, isIosStandalonePwa, mockAuth } = vi.hoisted(() => {
  const mockAuth = {
    currentUser: null as { uid: string; isAnonymous?: boolean } | null,
  };
  return {
    mockAuth,
    getFirebaseAuth: vi.fn(() => mockAuth),
    isIosStandalonePwa: vi.fn(() => false),
  };
});

vi.mock("../../services/core/firebase/firebase", () => ({
  getFirebaseAuth,
}));

vi.mock("../../domain/device/pwa/isIosStandalonePwa", () => ({
  isIosStandalonePwa,
}));

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("OAuthSignInButton", () => {
  beforeEach(() => {
    mockAuth.currentUser = { uid: "anon-1", isAnonymous: true };
    isIosStandalonePwa.mockReturnValue(false);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
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
      expect(onError).toHaveBeenCalledWith(expect.stringMatching(/isn’t ready yet/i));
    });
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it("reports a Firebase config error instead of rejecting unhandled", async () => {
    getFirebaseAuth.mockImplementationOnce(() => {
      throw new Error("Firebase environment variables are not configured.");
    });
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
      expect(onError).toHaveBeenCalledWith("Firebase environment variables are not configured.");
    });
    expect(onSignIn).not.toHaveBeenCalled();
  });

  describe("home-screen resume recovery", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function renderButton(props: {
      onSignIn: () => Promise<unknown>;
      onSuccess?: () => Promise<void>;
      onError?: (message: string) => void;
    }) {
      render(
        <OAuthSignInButton
          provider="google"
          onSignIn={props.onSignIn}
          onSuccess={props.onSuccess ?? vi.fn(async () => undefined)}
          onError={props.onError ?? vi.fn()}
          label="Continue with Google"
          icon={<span>G</span>}
        />,
      );
    }

    it("resets a stuck home-screen sign-in after the player returns, and still finishes a late success", async () => {
      isIosStandalonePwa.mockReturnValue(true);
      let resolveSignIn: (() => void) | undefined;
      const onSignIn = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSignIn = resolve;
          }),
      );
      const onSuccess = vi.fn(async () => undefined);
      const onError = vi.fn();
      renderButton({ onSignIn, onSuccess, onError });

      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("button")).toBeDisabled();

      await act(async () => {
        setVisibility("hidden");
        vi.advanceTimersByTime(OAUTH_RESUME_GRACE_MS * 2);
      });
      expect(onError).not.toHaveBeenCalled();

      await act(async () => {
        setVisibility("visible");
        vi.advanceTimersByTime(OAUTH_RESUME_GRACE_MS);
      });
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(OAUTH_RESUME_TIMEOUT_MESSAGE);
      expect(screen.getByRole("button")).toBeEnabled();

      await act(async () => {
        resolveSignIn?.();
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("lets the first success win when a timed-out attempt resolves during a retry", async () => {
      isIosStandalonePwa.mockReturnValue(true);
      const attempts: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
      const onSignIn = vi.fn(
        () =>
          new Promise<void>((resolve, reject) => {
            attempts.push({ resolve, reject });
          }),
      );
      const onSuccess = vi.fn(async () => undefined);
      const onError = vi.fn();
      renderButton({ onSignIn, onSuccess, onError });

      fireEvent.click(screen.getByRole("button"));
      await act(async () => {
        setVisibility("hidden");
        setVisibility("visible");
        vi.advanceTimersByTime(OAUTH_RESUME_GRACE_MS);
      });
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(OAUTH_RESUME_TIMEOUT_MESSAGE);
      expect(screen.getByRole("button")).toBeEnabled();

      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("button")).toBeDisabled();
      expect(onSignIn).toHaveBeenCalledTimes(2);

      await act(async () => {
        attempts[0].resolve();
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button")).toBeEnabled();

      await act(async () => {
        vi.advanceTimersByTime(OAUTH_NEVER_HIDDEN_GRACE_MS * 2);
      });
      expect(onError).toHaveBeenCalledTimes(1);

      await act(async () => {
        attempts[1].reject(new Error("cancelled"));
      });
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("waits for the longer fallback when the app never went hidden", async () => {
      isIosStandalonePwa.mockReturnValue(true);
      const onSignIn = vi.fn(() => new Promise<void>(() => {}));
      const onError = vi.fn();
      renderButton({ onSignIn, onError });

      fireEvent.click(screen.getByRole("button"));

      await act(async () => {
        vi.advanceTimersByTime(OAUTH_RESUME_GRACE_MS);
      });
      expect(onError).not.toHaveBeenCalled();
      expect(screen.getByRole("button")).toBeDisabled();

      await act(async () => {
        vi.advanceTimersByTime(OAUTH_NEVER_HIDDEN_GRACE_MS - OAUTH_RESUME_GRACE_MS);
      });
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(OAUTH_RESUME_TIMEOUT_MESSAGE);
      expect(screen.getByRole("button")).toBeEnabled();
    });

    it("keeps a home-screen redirect busy without a timeout error", async () => {
      isIosStandalonePwa.mockReturnValue(true);
      const onSignIn = vi.fn(() => Promise.reject(new OAuthRedirectInProgressError()));
      const onError = vi.fn();
      renderButton({ onSignIn, onError });

      fireEvent.click(screen.getByRole("button"));
      await act(async () => {});

      await act(async () => {
        vi.advanceTimersByTime(OAUTH_NEVER_HIDDEN_GRACE_MS * 2);
      });
      expect(onError).not.toHaveBeenCalled();
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("leaves popup handling to Firebase outside home-screen mode", async () => {
      const onSignIn = vi.fn(() => new Promise<void>(() => {}));
      const onError = vi.fn();
      renderButton({ onSignIn, onError });

      fireEvent.click(screen.getByRole("button"));

      await act(async () => {
        vi.advanceTimersByTime(OAUTH_RESUME_GRACE_MS * 2);
      });
      expect(onError).not.toHaveBeenCalled();
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });
});
