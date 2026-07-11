import { FirebaseError } from "firebase/app";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  isSignInWithEmailLink,
  linkWithCredential,
  linkWithPopup,
  sendSignInLinkToEmail,
  signInWithCredential,
  signInWithEmailLink,
  signInWithPopup,
  type AuthCredential,
  type AuthProvider,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

export const EMAIL_LINK_STORAGE_KEY = "premiumEmailForSignIn";

/** Flip when Apple Sign-In is configured in Firebase + Apple Developer. */
export const APPLE_SIGN_IN_ENABLED = false;

export function isAnonymousUser(user?: User | null): boolean {
  if (user !== undefined) {
    return user?.isAnonymous === true;
  }

  const current = getFirebaseAuth().currentUser;
  return current?.isAnonymous === true;
}

export function isPermanentUser(user?: User | null): boolean {
  if (user !== undefined) {
    return user != null && !user.isAnonymous;
  }

  const current = getFirebaseAuth().currentUser;
  return current != null && !current.isAnonymous;
}

export function premiumAuthContinueUrl(path = "/premium"): string {
  if (typeof window === "undefined") {
    return `https://jetlag.gelbhart.dev${path}`;
  }

  return `${window.location.origin}${path}`;
}

function mapAuthError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(fallback);
}

function isCredentialAlreadyInUse(error: unknown): boolean {
  return (
    error instanceof FirebaseError &&
    error.code === "auth/credential-already-in-use"
  );
}

async function linkCredentialOrSignInExisting(
  credential: AuthCredential,
): Promise<User> {
  const auth = getFirebaseAuth();

  if (!auth.currentUser?.isAnonymous) {
    const signedIn = await signInWithCredential(auth, credential);
    return signedIn.user;
  }

  try {
    const linked = await linkWithCredential(auth.currentUser, credential);
    return linked.user;
  } catch (error) {
    if (!isCredentialAlreadyInUse(error)) {
      throw error;
    }

    const signedIn = await signInWithCredential(auth, credential);
    return signedIn.user;
  }
}

async function linkWithPopupOrSignInExisting(
  provider: AuthProvider,
): Promise<User> {
  const auth = getFirebaseAuth();

  if (!auth.currentUser?.isAnonymous) {
    const signedIn = await signInWithPopup(auth, provider);
    return signedIn.user;
  }

  try {
    const linked = await linkWithPopup(auth.currentUser, provider);
    return linked.user;
  } catch (error) {
    if (!isCredentialAlreadyInUse(error)) {
      throw error;
    }

    const credential = OAuthProvider.credentialFromError(
      error as FirebaseError,
    );
    if (!credential) {
      throw error;
    }

    const signedIn = await signInWithCredential(auth, credential);
    return signedIn.user;
  }
}

async function completeGoogleCredential(credential: ReturnType<
  typeof GoogleAuthProvider.credential
>): Promise<User> {
  return linkCredentialOrSignInExisting(credential);
}

export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
  try {
    return await completeGoogleCredential(GoogleAuthProvider.credential(idToken));
  } catch (error) {
    throw mapAuthError(error, "Google sign-in failed.");
  }
}

export async function signInWithGoogle(): Promise<User> {
  return signInWithOAuthPopup(new GoogleAuthProvider(), "Google sign-in failed.");
}

function createAppleProvider(): OAuthProvider {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  return provider;
}

export async function signInWithApple(): Promise<User> {
  return signInWithOAuthPopup(createAppleProvider(), "Apple sign-in failed.");
}

async function signInWithOAuthPopup(
  provider: AuthProvider,
  fallbackMessage: string,
): Promise<User> {
  try {
    return await linkWithPopupOrSignInExisting(provider);
  } catch (error) {
    throw mapAuthError(error, fallbackMessage);
  }
}

export async function sendPremiumEmailSignInLink(
  email: string,
  continuePath = "/premium",
): Promise<void> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    throw new Error("Enter your email address.");
  }

  const auth = getFirebaseAuth();

  try {
    await sendSignInLinkToEmail(auth, trimmedEmail, {
      url: premiumAuthContinueUrl(continuePath),
      handleCodeInApp: true,
    });
    window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, trimmedEmail);
  } catch (error) {
    throw mapAuthError(error, "Could not send sign-in link.");
  }
}

export async function completePremiumEmailSignInLink(
  linkUrl = window.location.href,
): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!isSignInWithEmailLink(auth, linkUrl)) {
    return null;
  }

  const storedEmail = window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY);
  if (!storedEmail) {
    throw new Error("Open the sign-in link on the same device where you requested it.");
  }

  try {
    if (auth.currentUser?.isAnonymous) {
      const credential = EmailAuthProvider.credentialWithLink(
        storedEmail,
        linkUrl,
      );
      const user = await linkCredentialOrSignInExisting(credential);
      window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
      return user;
    }

    const credential = await signInWithEmailLink(auth, storedEmail, linkUrl);
    window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
    return credential.user;
  } catch (error) {
    throw mapAuthError(error, "Email sign-in link is invalid or expired.");
  }
}
