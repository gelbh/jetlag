import { type Page } from "@playwright/test";

/** The bridge installs via dynamic import after boot, so wait before evaluating. */
async function waitForE2EBridge(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__JETLAG_E2E__ != null);
}

export async function listPendingQuestionIds(page: Page, sessionId: string): Promise<string[]> {
  await waitForE2EBridge(page);
  return page.evaluate(async (id) => {
    const bridge = window.__JETLAG_E2E__;
    if (!bridge?.listPendingQuestionIds) {
      throw new Error("E2E bridge is not installed.");
    }
    return bridge.listPendingQuestionIds(id);
  }, sessionId);
}

/** Must match firebase.json emulators.firestore.port and VITE_FIREBASE_PROJECT_ID in playwright.config.ts. */
const FIRESTORE_EMULATOR_ORIGIN = "http://127.0.0.1:8180";
const E2E_FIREBASE_PROJECT_ID = "demo-jetlag";

/**
 * Move a question's answer window into the past. Rules pin `receivedAt` to
 * request.time, so no client can backdate it; the emulator's `Bearer owner`
 * REST access bypasses rules. Both anchors move because the deadline counts
 * from the later of the two.
 */
export async function backdatePendingQuestionDeadline(
  sessionId: string,
  questionId: string,
  anchorIso: string,
): Promise<void> {
  const path = `projects/${E2E_FIREBASE_PROJECT_ID}/databases/(default)/documents/sessions/${sessionId}/pendingQuestions/${questionId}`;
  const mask = "updateMask.fieldPaths=answerableAt&updateMask.fieldPaths=receivedAt";
  const response = await fetch(`${FIRESTORE_EMULATOR_ORIGIN}/v1/${path}?${mask}`, {
    method: "PATCH",
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        answerableAt: { stringValue: anchorIso },
        receivedAt: { timestampValue: anchorIso },
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Backdating question ${questionId} failed: ${response.status}`);
  }
}

export async function advanceLocalTimerElapsedMs(
  page: Page,
  sessionId: string,
  elapsedMs: number,
): Promise<void> {
  await page.evaluate(
    ({ targetSessionId, targetElapsedMs }) => {
      const raw = localStorage.getItem("jetlag-timer");
      const parsed = raw
        ? (JSON.parse(raw) as {
            state?: {
              bySessionId?: Record<
                string,
                { accumulatedMs?: number; runningSince?: number | null }
              >;
            };
          })
        : { state: { bySessionId: {} } };

      parsed.state ??= { bySessionId: {} };
      parsed.state.bySessionId ??= {};
      parsed.state.bySessionId[targetSessionId] = {
        accumulatedMs: targetElapsedMs,
        // runningSince is server-frame; local e2e server clock offset is ~0.
        runningSince: Date.now(),
      };
      localStorage.setItem("jetlag-timer", JSON.stringify(parsed));
    },
    { targetSessionId: sessionId, targetElapsedMs: elapsedMs },
  );
}

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

export async function endSessionInEmulator(page: Page, sessionId: string): Promise<void> {
  await waitForE2EBridge(page);
  await page.evaluate(async (id) => {
    const bridge = window.__JETLAG_E2E__;
    if (!bridge?.endRemoteSession) {
      throw new Error("E2E bridge is not installed.");
    }
    await bridge.endRemoteSession(id);
  }, sessionId);
}

export async function rotateAnonymousAuth(page: Page): Promise<string> {
  await waitForE2EBridge(page);
  return page.evaluate(async () => {
    const bridge = window.__JETLAG_E2E__;
    if (!bridge?.rotateAnonymousAuth) {
      throw new Error("E2E bridge is not installed.");
    }
    return bridge.rotateAnonymousAuth();
  });
}

export async function advanceRemoteSessionTimerInEmulator(
  page: Page,
  sessionId: string,
  elapsedMs: number,
): Promise<void> {
  await waitForE2EBridge(page);
  await page.evaluate(
    async ({ id, ms }) => {
      const bridge = window.__JETLAG_E2E__;
      if (!bridge?.patchSessionTimer) {
        throw new Error("E2E bridge is not installed.");
      }
      await bridge.patchSessionTimer(id, ms);
    },
    { id: sessionId, ms: elapsedMs },
  );
}
