import { EmailAuthProvider, GoogleAuthProvider } from "firebase/auth";

export type AnalyticsAuthProvider = "google" | "apple" | "email" | "unknown";

const BY_ID: Partial<Record<string, Exclude<AnalyticsAuthProvider, "unknown">>> = {
  [GoogleAuthProvider.PROVIDER_ID]: "google",
  "apple.com": "apple",
  [EmailAuthProvider.PROVIDER_ID]: "email",
};

export function mapFirebaseAuthProvider(
  providerId: string | null | undefined,
): AnalyticsAuthProvider {
  if (!providerId) return "unknown";
  return BY_ID[providerId] ?? "unknown";
}
