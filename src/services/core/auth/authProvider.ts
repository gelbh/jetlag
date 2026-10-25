export type AnalyticsAuthProvider = "google" | "apple" | "email" | "unknown";

/** Firebase Auth providerId strings (avoid importing firebase/auth so test mocks stay thin). */
const BY_ID: Partial<Record<string, Exclude<AnalyticsAuthProvider, "unknown">>> = {
  "google.com": "google",
  "apple.com": "apple",
  password: "email",
};

export function mapFirebaseAuthProvider(
  providerId: string | null | undefined,
): AnalyticsAuthProvider {
  if (!providerId) return "unknown";
  return BY_ID[providerId] ?? "unknown";
}
