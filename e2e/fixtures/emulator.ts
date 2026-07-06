import { type Page } from "@playwright/test";

export async function readPersistedSessionId(page: Page): Promise<string> {
  const sessionId = await page.evaluate(() => {
    const raw = localStorage.getItem("jetlag-session");
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as {
      state?: { session?: { id?: string } };
    };

    return parsed.state?.session?.id ?? null;
  });

  if (!sessionId) {
    throw new Error("No persisted session id in localStorage.");
  }

  return sessionId;
}

export async function endSessionInEmulator(
  page: Page,
  sessionId: string,
): Promise<void> {
  await page.evaluate(async (id) => {
    const { endRemoteSession } = await import(
      "/src/services/firestoreAnnotations.ts"
    );
    await endRemoteSession(id);
  }, sessionId);
}
