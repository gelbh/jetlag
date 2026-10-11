import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeOAuthRedirectIfPending,
  completePremiumEmailSignInLink,
  consumeOAuthRedirectFailureMessage,
  isAnonymousUser,
  isPermanentUser,
  OAUTH_REDIRECT_FAILED_MESSAGE,
  OAUTH_REDIRECT_PENDING_KEY,
  OAuthRedirectInProgressError,
  resetOAuthRedirectRecoveryForTests,
  signInWithApple,
  signInWithGoogle,
  signInWithGoogleIdToken,
} from "./accountAuth";

const {
  mockAuth,
  linkWithCredential,
  linkWithPopup,
  linkWithRedirect,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  credentialFromError,
  isSignInWithEmailLink,
  credentialWithLink,
  signInWithEmailLink,
  trackLazy,
} = vi.hoisted(() => ({
  mockAuth: {
    currentUser: null as { isAnonymous: boolean; uid: string } | null,
  },
  linkWithCredential: vi.fn(),
  linkWithPopup: vi.fn(),
  linkWithRedirect: vi.fn(),
  signInWithCredential: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(),
  credentialFromError: vi.fn(),
  isSignInWithEmailLink: vi.fn(),
  credentialWithLink: vi.fn(),
  signInWithEmailLink: vi.fn(),
  trackLazy: vi.fn(),
}));

vi.mock("../analytics/lazyTelemetry", () => ({ trackLazy }));

vi.mock("firebase/auth", () => ({
  EmailAuthProvider: {
    credentialWithLink: (...args: unknown[]) => credentialWithLink(...args),
  },
  GoogleAuthProvider: class {
    providerId = "google.com";
    static credential = vi.fn(() => ({
      providerId: "google.com",
      token: "id-token",
    }));
  },
  OAuthProvider: class {
    providerId: string;
    constructor(providerId: string) {
      this.providerId = providerId;
    }
    addScope() {}
    static credentialFromError = (...args: unknown[]) => credentialFromError(...args);
  },
  getRedirectResult: (...args: unknown[]) => getRedirectResult(...args),
  isSignInWithEmailLink: (...args: unknown[]) => isSignInWithEmailLink(...args),
  linkWithCredential: (...args: unknown[]) => linkWithCredential(...args),
  linkWithPopup: (...args: unknown[]) => linkWithPopup(...args),
  linkWithRedirect: (...args: unknown[]) => linkWithRedirect(...args),
  sendSignInLinkToEmail: vi.fn(),
  signInWithCredential: (...args: unknown[]) => signInWithCredential(...args),
  signInWithEmailLink: (...args: unknown[]) => signInWithEmailLink(...args),
  signInWithPopup: (...args: unknown[]) => signInWithPopup(...args),
  signInWithRedirect: (...args: unknown[]) => signInWithRedirect(...args),
}));

vi.mock("../firebase/firebase", () => ({
  getFirebaseAuth: () => mockAuth,
}));

describe("accountAuth", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.currentUser = null;
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetOAuthRedirectRecoveryForTests();
  });

  it("detects anonymous users", () => {
    expect(isAnonymousUser({ isAnonymous: true } as never)).toBe(true);
    expect(isAnonymousUser({ isAnonymous: false } as never)).toBe(false);
    expect(isAnonymousUser(null)).toBe(false);
  });

  it("detects permanent users", () => {
    expect(isPermanentUser({ isAnonymous: false } as never)).toBe(true);
    expect(isPermanentUser({ isAnonymous: true } as never)).toBe(false);
    expect(isPermanentUser(null)).toBe(false);
  });

  it("links Google to an anonymous user", async () => {
    mockAuth.currentUser = { isAnonymous: true, uid: "anon-1" };
    linkWithCredential.mockResolvedValueOnce({
      user: { uid: "anon-1", isAnonymous: false },
    });

    const user = await signInWithGoogleIdToken("google-id-token");

    expect(user.uid).toBe("anon-1");
    expect(linkWithCredential).toHaveBeenCalledWith(mockAuth.currentUser, {
      providerId: "google.com",
      token: "id-token",
    });
  });

  it("signs in to an existing Google account when the credential is already in use", async () => {
    mockAuth.currentUser = { isAnonymous: true, uid: "anon-2" };
    linkWithCredential.mockRejectedValueOnce(
      new FirebaseError("auth/credential-already-in-use", "Already linked."),
    );
    signInWithCredential.mockResolvedValueOnce({
      user: { uid: "existing-google", isAnonymous: false },
    });

    const user = await signInWithGoogleIdToken("google-id-token");

    expect(user.uid).toBe("existing-google");
    expect(signInWithCredential).toHaveBeenCalledWith(mockAuth, {
      providerId: "google.com",
      token: "id-token",
    });
  });

  it("uses Google popup for anonymous sign-in", async () => {
    mockAuth.currentUser = { isAnonymous: true, uid: "anon-3" };
    linkWithPopup.mockResolvedValueOnce({
      user: { uid: "anon-3", isAnonymous: false },
    });

    const user = await signInWithGoogle();

    expect(user.uid).toBe("anon-3");
    expect(linkWithPopup).toHaveBeenCalledWith(mockAuth.currentUser, expect.anything());
    expect(linkWithRedirect).not.toHaveBeenCalled();
  });

  it("uses Google popup for signed-in users", async () => {
    mockAuth.currentUser = { isAnonymous: false, uid: "signed-in" };
    signInWithPopup.mockResolvedValueOnce({
      user: { uid: "signed-in", isAnonymous: false },
    });

    const user = await signInWithGoogle();

    expect(user.uid).toBe("signed-in");
    expect(signInWithPopup).toHaveBeenCalledWith(mockAuth, expect.anything());
    expect(signInWithRedirect).not.toHaveBeenCalled();
  });

  it("redirects when Google popup is blocked", async () => {
    mockAuth.currentUser = { isAnonymous: true, uid: "anon-redirect" };
    linkWithPopup.mockRejectedValueOnce(new FirebaseError("auth/popup-blocked", "Popup blocked."));
    linkWithRedirect.mockResolvedValueOnce(undefined);

    await expect(signInWithGoogle()).rejects.toBeInstanceOf(OAuthRedirectInProgressError);
    expect(linkWithRedirect).toHaveBeenCalledWith(mockAuth.currentUser, expect.anything());
    expect(window.sessionStorage.getItem(OAUTH_REDIRECT_PENDING_KEY)).toBeTruthy();
  });

  it("redirects when signed-in Google popup is blocked", async () => {
    mockAuth.currentUser = { isAnonymous: false, uid: "signed-in" };
    signInWithPopup.mockRejectedValueOnce(
      new FirebaseError("auth/popup-blocked", "Popup blocked."),
    );
    signInWithRedirect.mockResolvedValueOnce(undefined);

    await expect(signInWithGoogle()).rejects.toBeInstanceOf(OAuthRedirectInProgressError);
    expect(signInWithRedirect).toHaveBeenCalledWith(mockAuth, expect.anything());
  });

  it("surfaces redirect start failure and clears the pending flag", async () => {
    mockAuth.currentUser = { isAnonymous: true, uid: "anon-5" };
    linkWithPopup.mockRejectedValueOnce(new FirebaseError("auth/popup-blocked", "Popup blocked."));
    linkWithRedirect.mockRejectedValueOnce(
      new FirebaseError("auth/network-request-failed", "Network error."),
    );

    await expect(signInWithGoogle()).rejects.toMatchObject({
      code: "auth/network-request-failed",
    });
    expect(linkWithPopup).toHaveBeenCalledTimes(1);
    expect(linkWithRedirect).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(OAUTH_REDIRECT_PENDING_KEY)).toBeNull();
  });

  it("signs in with Google popup when credential is already in use", async () => {
    mockAuth.currentUser = { isAnonymous: true, uid: "anon-3" };
    linkWithPopup.mockRejectedValueOnce(
      new FirebaseError("auth/credential-already-in-use", "Already linked."),
    );
    credentialFromError.mockReturnValueOnce({
      providerId: "google.com",
      token: "popup-token",
    });
    signInWithCredential.mockResolvedValueOnce({
      user: { uid: "existing-google", isAnonymous: false },
    });

    const user = await signInWithGoogle();

    expect(user.uid).toBe("existing-google");
    expect(signInWithCredential).toHaveBeenCalledWith(mockAuth, {
      providerId: "google.com",
      token: "popup-token",
    });
  });

  it("does not redirect when a concurrent popup request is cancelled", async () => {
    mockAuth.currentUser = { isAnonymous: true, uid: "anon-cancelled" };
    linkWithPopup.mockRejectedValueOnce(
      new FirebaseError("auth/cancelled-popup-request", "Cancelled."),
    );

    await expect(signInWithGoogle()).rejects.toMatchObject({
      code: "auth/cancelled-popup-request",
    });
    expect(linkWithRedirect).not.toHaveBeenCalled();
    expect(signInWithRedirect).not.toHaveBeenCalled();
  });

  it("dedupes concurrent OAuth redirect completion", async () => {
    getRedirectResult.mockResolvedValueOnce({
      user: { uid: "redirect-user", isAnonymous: false },
    });

    const [first, second] = await Promise.all([
      completeOAuthRedirectIfPending(),
      completeOAuthRedirectIfPending(),
    ]);

    expect(first?.uid).toBe("redirect-user");
    expect(second?.uid).toBe("redirect-user");
    expect(getRedirectResult).toHaveBeenCalledTimes(1);
  });

  it("returns the signed-in user when Firebase redirect assertion fails", async () => {
    mockAuth.currentUser = { uid: "redirect-user", isAnonymous: false };
    getRedirectResult.mockRejectedValueOnce(
      new Error("INTERNAL ASSERTION FAILED: Pending promise was never set"),
    );

    const user = await completeOAuthRedirectIfPending();

    expect(user?.uid).toBe("redirect-user");
  });

  it("returns null when no OAuth redirect is pending", async () => {
    getRedirectResult.mockResolvedValueOnce(null);

    const user = await completeOAuthRedirectIfPending();

    expect(user).toBeNull();
  });

  it("notes a player-facing failure when a pending redirect returns no user", async () => {
    window.sessionStorage.setItem(OAUTH_REDIRECT_PENDING_KEY, String(Date.now()));
    getRedirectResult.mockResolvedValueOnce(null);

    const user = await completeOAuthRedirectIfPending();

    expect(user).toBeNull();
    expect(consumeOAuthRedirectFailureMessage()).toBe(OAUTH_REDIRECT_FAILED_MESSAGE);
    expect(consumeOAuthRedirectFailureMessage()).toBeNull();
    expect(window.sessionStorage.getItem(OAUTH_REDIRECT_PENDING_KEY)).toBeNull();
  });

  it("ignores a stale redirect-pending flag without surfacing failure", async () => {
    window.sessionStorage.setItem(OAUTH_REDIRECT_PENDING_KEY, String(Date.now() - 11 * 60 * 1000));
    getRedirectResult.mockResolvedValueOnce(null);

    const user = await completeOAuthRedirectIfPending();

    expect(user).toBeNull();
    expect(consumeOAuthRedirectFailureMessage()).toBeNull();
    expect(window.sessionStorage.getItem(OAUTH_REDIRECT_PENDING_KEY)).toBeNull();
  });

  it("still honors a legacy pending marker of 1", async () => {
    window.sessionStorage.setItem(OAUTH_REDIRECT_PENDING_KEY, "1");
    getRedirectResult.mockResolvedValueOnce(null);

    const user = await completeOAuthRedirectIfPending();

    expect(user).toBeNull();
    expect(consumeOAuthRedirectFailureMessage()).toBe(OAUTH_REDIRECT_FAILED_MESSAGE);
  });

  it("signs in with email link when the credential is already in use", async () => {
    mockAuth.currentUser = { isAnonymous: true, uid: "anon-4" };
    isSignInWithEmailLink.mockReturnValueOnce(true);
    window.localStorage.setItem("premiumEmailForSignIn", "player@example.com");
    credentialWithLink.mockReturnValueOnce({
      providerId: "password",
      email: "player@example.com",
    });
    linkWithCredential.mockRejectedValueOnce(
      new FirebaseError("auth/credential-already-in-use", "Already linked."),
    );
    signInWithCredential.mockResolvedValueOnce({
      user: { uid: "existing-email", isAnonymous: false },
    });

    const user = await completePremiumEmailSignInLink("https://localhost/premium");

    expect(user?.uid).toBe("existing-email");
    expect(window.localStorage.getItem("premiumEmailForSignIn")).toBeNull();
  });

  describe("account_linked tracking", () => {
    const upgraded = { uid: "u", isAnonymous: false };

    it("tracks a linked Google ID token", async () => {
      mockAuth.currentUser = { isAnonymous: true, uid: "anon" };
      linkWithCredential.mockResolvedValueOnce({
        user: upgraded,
        operationType: "link",
        providerId: "google.com",
      });

      await signInWithGoogleIdToken("google-id-token");

      expect(trackLazy).toHaveBeenCalledOnce();
      expect(trackLazy).toHaveBeenCalledWith("account_linked", {
        provider: "google",
        outcome: "linked",
      });
    });

    it("tracks signing in to an existing Google account after credential-already-in-use", async () => {
      mockAuth.currentUser = { isAnonymous: true, uid: "anon" };
      linkWithCredential.mockRejectedValueOnce(
        new FirebaseError("auth/credential-already-in-use", "Already linked."),
      );
      signInWithCredential.mockResolvedValueOnce({
        user: upgraded,
        operationType: "signIn",
        providerId: "google.com",
      });

      await signInWithGoogleIdToken("google-id-token");

      expect(trackLazy).toHaveBeenCalledOnce();
      expect(trackLazy).toHaveBeenCalledWith("account_linked", {
        provider: "google",
        outcome: "signed_in_existing",
      });
    });

    it("tracks a Google popup sign-in for a permanent user", async () => {
      mockAuth.currentUser = { isAnonymous: false, uid: "perm" };
      signInWithPopup.mockResolvedValueOnce({
        user: upgraded,
        operationType: "signIn",
        providerId: "google.com",
      });

      await signInWithGoogle();

      expect(trackLazy).toHaveBeenCalledOnce();
      expect(trackLazy).toHaveBeenCalledWith("account_linked", {
        provider: "google",
        outcome: "signed_in_existing",
      });
    });

    it("tracks an Apple popup link", async () => {
      mockAuth.currentUser = { isAnonymous: true, uid: "anon" };
      linkWithPopup.mockResolvedValueOnce({
        user: upgraded,
        operationType: "link",
        providerId: "apple.com",
      });

      await signInWithApple();

      expect(trackLazy).toHaveBeenCalledOnce();
      expect(trackLazy).toHaveBeenCalledWith("account_linked", {
        provider: "apple",
        outcome: "linked",
      });
    });

    it("tracks an Apple popup credential-already-in-use fallback", async () => {
      mockAuth.currentUser = { isAnonymous: true, uid: "anon" };
      linkWithPopup.mockRejectedValueOnce(
        new FirebaseError("auth/credential-already-in-use", "Already linked."),
      );
      credentialFromError.mockReturnValueOnce({ providerId: "apple.com" });
      signInWithCredential.mockResolvedValueOnce({
        user: upgraded,
        operationType: "signIn",
        providerId: "apple.com",
      });

      await signInWithApple();

      expect(trackLazy).toHaveBeenCalledOnce();
      expect(trackLazy).toHaveBeenCalledWith("account_linked", {
        provider: "apple",
        outcome: "signed_in_existing",
      });
    });

    it("tracks an email link that links an anonymous user when providerId is null", async () => {
      mockAuth.currentUser = { isAnonymous: true, uid: "anon" };
      isSignInWithEmailLink.mockReturnValueOnce(true);
      window.localStorage.setItem("premiumEmailForSignIn", "player@example.com");
      credentialWithLink.mockReturnValueOnce({ providerId: "password" });
      linkWithCredential.mockResolvedValueOnce({
        user: upgraded,
        operationType: "link",
        providerId: null,
      });

      await completePremiumEmailSignInLink("https://localhost/premium");

      expect(trackLazy).toHaveBeenCalledOnce();
      expect(trackLazy).toHaveBeenCalledWith("account_linked", {
        provider: "email",
        outcome: "linked",
      });
    });

    it("tracks an email link sign-in for a permanent user when providerId is null", async () => {
      mockAuth.currentUser = { isAnonymous: false, uid: "perm" };
      isSignInWithEmailLink.mockReturnValueOnce(true);
      window.localStorage.setItem("premiumEmailForSignIn", "player@example.com");
      signInWithEmailLink.mockResolvedValueOnce({
        user: upgraded,
        operationType: "signIn",
        providerId: null,
      });

      await completePremiumEmailSignInLink("https://localhost/premium");

      expect(trackLazy).toHaveBeenCalledOnce();
      expect(trackLazy).toHaveBeenCalledWith("account_linked", {
        provider: "email",
        outcome: "signed_in_existing",
      });
    });

    it("tracks a redirect result credential once across concurrent completions", async () => {
      getRedirectResult.mockResolvedValueOnce({
        user: upgraded,
        operationType: "link",
        providerId: "google.com",
      });

      await Promise.all([completeOAuthRedirectIfPending(), completeOAuthRedirectIfPending()]);

      expect(trackLazy).toHaveBeenCalledOnce();
      expect(trackLazy).toHaveBeenCalledWith("account_linked", {
        provider: "google",
        outcome: "linked",
      });
    });

    it("tracks the redirect credential-already-in-use fallback", async () => {
      mockAuth.currentUser = { isAnonymous: true, uid: "anon" };
      getRedirectResult.mockRejectedValueOnce(
        new FirebaseError("auth/credential-already-in-use", "Already linked."),
      );
      credentialFromError.mockReturnValueOnce({ providerId: "google.com" });
      linkWithCredential.mockRejectedValueOnce(
        new FirebaseError("auth/credential-already-in-use", "Already linked."),
      );
      signInWithCredential.mockResolvedValueOnce({
        user: upgraded,
        operationType: "signIn",
        providerId: "google.com",
      });

      await completeOAuthRedirectIfPending();

      expect(trackLazy).toHaveBeenCalledOnce();
      expect(trackLazy).toHaveBeenCalledWith("account_linked", {
        provider: "google",
        outcome: "signed_in_existing",
      });
    });

    it("does not track a null redirect result or pending-promise recovery", async () => {
      getRedirectResult.mockResolvedValueOnce(null);
      await completeOAuthRedirectIfPending();

      resetOAuthRedirectRecoveryForTests();
      mockAuth.currentUser = { uid: "redirect-user", isAnonymous: false };
      getRedirectResult.mockRejectedValueOnce(
        new Error("INTERNAL ASSERTION FAILED: Pending promise was never set"),
      );
      await completeOAuthRedirectIfPending();

      expect(trackLazy).not.toHaveBeenCalled();
    });

    it("does not track when the redirect starts", async () => {
      mockAuth.currentUser = { isAnonymous: true, uid: "anon" };
      linkWithPopup.mockRejectedValueOnce(new FirebaseError("auth/popup-blocked", "Blocked."));
      linkWithRedirect.mockResolvedValueOnce(undefined);

      await expect(signInWithGoogle()).rejects.toBeInstanceOf(OAuthRedirectInProgressError);

      expect(trackLazy).not.toHaveBeenCalled();
    });

    it("does not track auth errors", async () => {
      mockAuth.currentUser = { isAnonymous: true, uid: "anon" };
      linkWithCredential.mockRejectedValueOnce(
        new FirebaseError("auth/network-request-failed", "Network error."),
      );

      await expect(signInWithGoogleIdToken("google-id-token")).rejects.toBeTruthy();

      expect(trackLazy).not.toHaveBeenCalled();
    });

    it("does not track unknown providers or reauthentication", async () => {
      mockAuth.currentUser = { isAnonymous: true, uid: "anon" };
      linkWithCredential.mockResolvedValueOnce({
        user: upgraded,
        operationType: "link",
        providerId: "github.com",
      });
      await signInWithGoogleIdToken("google-id-token");

      getRedirectResult.mockResolvedValueOnce({
        user: upgraded,
        operationType: "reauthenticate",
        providerId: "google.com",
      });
      await completeOAuthRedirectIfPending();

      expect(trackLazy).not.toHaveBeenCalled();
    });
  });
});
