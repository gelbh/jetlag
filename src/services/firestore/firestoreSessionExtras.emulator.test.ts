import { beforeEach, describe, expect, it } from "vitest";
import {
  connectEmulatorsForTests,
  teardownEmulatorsForTests,
} from "../../test/emulator/connectEmulators";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";
import { createRemoteSession } from "./firestoreAnnotations";
import {
  subscribeToPendingQuestions,
  updatePendingQuestion,
  writePendingQuestion,
} from "./firestoreSessionExtras";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";

function samplePendingQuestion(
  sessionId: string,
  overrides: Partial<PendingQuestionRecord> = {},
): PendingQuestionRecord {
  return {
    id: "pq-emulator-1",
    sessionId,
    toolType: "radar",
    createdByUid: "seeker-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "pending",
    placement: {
      geometryJson: JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [-0.15, 51.45] },
      }),
      metadata: { radiusMeters: 1609 },
    },
    replyOptions: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
    promptText: "Are you within 1 mi of me?",
    answerableAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

async function viWaitFor(assertion: () => void, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      assertion();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  assertion();
}

describe("firestoreSessionExtras emulator", () => {
  beforeEach(async () => {
    await teardownEmulatorsForTests();
    await connectEmulatorsForTests();
  });

  it("writes, updates, and notifies pending question subscribers", async () => {
    const { uid } = await connectEmulatorsForTests();
    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, uid);
    const question = samplePendingQuestion(session.id, { createdByUid: uid });

    const received: PendingQuestionRecord[] = [];
    const unsubscribe = subscribeToPendingQuestions(
      session.id,
      (questions) => {
        received.splice(0, received.length, ...questions);
      },
      (error) => {
        throw error;
      },
    );

    await writePendingQuestion(session.id, question);

    await viWaitFor(() => {
      expect(received.some((item) => item.id === question.id)).toBe(true);
      expect(received[0]?.status).toBe("pending");
    });

    await updatePendingQuestion(session.id, question.id, {
      answerableAt: "2026-01-02T00:00:00.000Z",
    });

    await viWaitFor(() => {
      const updated = received.find((item) => item.id === question.id);
      expect(updated?.answerableAt).toBe("2026-01-02T00:00:00.000Z");
    });

    await updatePendingQuestion(session.id, question.id, {
      deadlineExpiredAt: "2026-01-01T00:10:00.000Z",
    });

    await viWaitFor(() => {
      const updated = received.find((item) => item.id === question.id);
      expect(updated?.deadlineExpiredAt).toBe("2026-01-01T00:10:00.000Z");
    });

    unsubscribe();
  });
});
