import { type Page } from "@playwright/test";

export async function listPendingQuestionIds(
  page: Page,
  sessionId: string,
): Promise<string[]> {
  return page.evaluate(async (id) => {
    const bridge = window.__JETLAG_E2E__;
    if (!bridge?.listPendingQuestionIds) {
      throw new Error("E2E bridge is not installed.");
    }
    return bridge.listPendingQuestionIds(id);
  }, sessionId);
}

export async function patchPendingQuestionAnswerableAt(
  page: Page,
  sessionId: string,
  questionId: string,
  answerableAt: string,
): Promise<void> {
  await page.evaluate(
    async ({ id, questionId: pendingQuestionId, answerableAt: nextAnswerableAt }) => {
      const bridge = window.__JETLAG_E2E__;
      if (!bridge?.patchPendingQuestionAnswerableAt) {
        throw new Error("E2E bridge is not installed.");
      }
      await bridge.patchPendingQuestionAnswerableAt(
        id,
        pendingQuestionId,
        nextAnswerableAt,
      );
    },
    { id: sessionId, questionId, answerableAt },
  );
}

export async function advanceLocalTimerElapsedMs(
  page: Page,
  sessionId: string,
  elapsedMs: number,
): Promise<void> {
  await page.evaluate(
    ({ targetSessionId, targetElapsedMs }) => {
      const raw = sessionStorage.getItem("jetlag-timer");
      const parsed = raw
        ? (JSON.parse(raw) as {
            state?: { bySessionId?: Record<string, { accumulatedMs?: number; runningSince?: number | null }> };
          })
        : { state: { bySessionId: {} } };

      parsed.state ??= { bySessionId: {} };
      parsed.state.bySessionId ??= {};
      parsed.state.bySessionId[targetSessionId] = {
        accumulatedMs: targetElapsedMs,
        runningSince: Date.now(),
      };
      sessionStorage.setItem("jetlag-timer", JSON.stringify(parsed));
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

export async function endSessionInEmulator(
  page: Page,
  sessionId: string,
): Promise<void> {
  await page.evaluate(async (id) => {
    const bridge = window.__JETLAG_E2E__;
    if (!bridge?.endRemoteSession) {
      throw new Error("E2E bridge is not installed.");
    }
    await bridge.endRemoteSession(id);
  }, sessionId);
}

export async function rotateAnonymousAuth(page: Page): Promise<string> {
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
