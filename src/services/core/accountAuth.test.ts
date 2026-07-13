import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeOAuthRedirectIfPending,
  completePremiumEmailSignInLink,
  isAnonymousUser,
  isOAuthRedirectInProgress,
  isPermanentUser,
  OAuthRedirectInProgressError,
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
}));

vi.mock("firebase/auth", () => ({
  EmailAuthProvider: {
    credentialWithLink: (...args: unknown[]) => credentialWithLink(...args),
  },
  GoogleAuthProvider: class {
    static credential = vi.fn(() => ({
      providerId: "google.com",
      token: "id-token",
    }));
  },
  OAuthProvider: class {
    static credentialFromError = (...args: unknown[]) =>
      credentialFromError(...args);
  },
  getRedirectResult: (...args: unknown[]) => getRedirectResult(...args),
  isSignInWithEmailLink: (...args: unknown[]) => isSignInWithEmailLink(...args),
  linkWithCredential: (...args: unknown[]) => linkWithCredential(...args),
  linkWithPopup: (...args: unknown[]) => linkWithPopup(...args),
  linkWithRedirect: (...args: unknown[]) => linkWithRedirect(...args),
  sendSignInLinkToEmail: vi.fn(),
  signInWithCredential: (...args: unknown[]) => signInWithCredential(...args),
  signInWithEmailLink: vi.fn(),
  signInWithPopup: (...args: unknown[]) => signInWithPopup(...args),
  signInWithRedirect: (...args: unknown[]) => signInWithRedirect(...args),
}));

vi.mock("./firebase", () => ({
  getFirebaseAuth: () => mockAuth,
}));

describe("accountAuth", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.currentUser = null;
    window.localStorage.clear();
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

  it("signs in with Google popup when the credential is already in use", async () => {
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

  it("signs in with popup when the current user is not anonymous", async () => {
    mockAuth.currentUser = { isAnonymous: false, uid: "signed-in" };
    signInWithPopup.mockResolvedValueOnce({
      user: { uid: "signed-in", isAnonymous: false },
    });

    const user = await signInWithGoogle();

    expect(user.uid).toBe("signed-in");
    expect(signInWithPopup).toHaveBeenCalled();
    expect(linkWithPopup).not.toHaveBeenCalled();
  });

  it("falls back to redirect when popup is blocked for an anonymous user", async () => {
    mockAuth.currentUser = { isAnonymous: true, uid: "anon-5" };
    linkWithPopup.mockRejectedValueOnce(
      new FirebaseError("auth/popup-blocked", "Popup blocked."),
    );
    linkWithRedirect.mockResolvedValueOnce(undefined);

    await expect(signInWithGoogle()).rejects.toBeInstanceOf(
      OAuthRedirectInProgressError,
    );
    expect(linkWithRedirect).toHaveBeenCalledWith(
      mockAuth.currentUser,
      expect.anything(),
    );
    expect(isOAuthRedirectInProgress(new OAuthRedirectInProgressError())).toBe(
      true,
    );
  });

  it("falls back to redirect when popup is blocked for a signed-in user", async () => {
    mockAuth.currentUser = { isAnonymous: false, uid: "signed-in" };
    signInWithPopup.mockRejectedValueOnce(
      new FirebaseError("auth/popup-blocked", "Popup blocked."),
    );
    signInWithRedirect.mockResolvedValueOnce(undefined);

    await expect(signInWithGoogle()).rejects.toBeInstanceOf(
      OAuthRedirectInProgressError,
    );
    expect(signInWithRedirect).toHaveBeenCalledWith(
      mockAuth,
      expect.anything(),
    );
  });

  it("completes OAuth redirect when getRedirectResult returns a user", async () => {
    getRedirectResult.mockResolvedValueOnce({
      user: { uid: "redirect-user", isAnonymous: false },
    });

    const user = await completeOAuthRedirectIfPending();

    expect(user?.uid).toBe("redirect-user");
  });

  it("returns null when no OAuth redirect is pending", async () => {
    getRedirectResult.mockResolvedValueOnce(null);

    const user = await completeOAuthRedirectIfPending();

    expect(user).toBeNull();
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
});
