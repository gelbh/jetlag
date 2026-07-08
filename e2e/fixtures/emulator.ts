import { type Page } from "@playwright/test";

const FIRESTORE_EMULATOR_HOST = "http://127.0.0.1:8180";
const FIRESTORE_PROJECT_ID = "demo-jetlag";

export async function listPendingQuestionIds(
  sessionId: string,
): Promise<string[]> {
  const response = await fetch(
    `${FIRESTORE_EMULATOR_HOST}/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/sessions/${sessionId}/pendingQuestions`,
  );
  if (!response.ok) {
    throw new Error(`Failed to list pending questions: ${response.status}`);
  }

  const payload = (await response.json()) as {
    documents?: Array<{ name?: string }>;
  };

  return (payload.documents ?? [])
    .map((document) => document.name?.split("/").pop())
    .filter((id): id is string => Boolean(id));
}

export async function patchPendingQuestionAnswerableAt(
  sessionId: string,
  questionId: string,
  answerableAt: string,
): Promise<void> {
  const response = await fetch(
    `${FIRESTORE_EMULATOR_HOST}/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/sessions/${sessionId}/pendingQuestions/${questionId}?updateMask.fieldPaths=answerableAt`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          answerableAt: { stringValue: answerableAt },
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to patch pending question: ${response.status}`);
  }
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
