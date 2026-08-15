import { describe, expect, it } from "vitest";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../session/activity/sessionChat";
import type { SessionRulesInput } from "../session/rules";
import { selectPrimaryHiderAnswerTarget } from "./selectPrimaryHiderAnswerTarget";

const NOW = Date.parse("2026-01-01T12:00:00.000Z");
const sessionRules = { gameSize: "medium" } as SessionRulesInput;

function pending(
  overrides: Partial<PendingQuestionRecord> & Pick<PendingQuestionRecord, "id">,
): PendingQuestionRecord {
  return {
    sessionId: "s1",
    toolType: "radar",
    createdByUid: "seeker",
    createdAt: "2026-01-01T11:00:00.000Z",
    status: "pending",
    placement: { geometryJson: "{}", metadata: {} },
    replyOptions: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
    promptText: "Near?",
    answerableAt: "2026-01-01T11:55:00.000Z",
    ...overrides,
  };
}

function questionMessage(
  pendingQuestionId: string,
  overrides: Partial<SessionMessageRecord> = {},
): SessionMessageRecord {
  return {
    id: `msg-${pendingQuestionId}`,
    sessionId: "s1",
    channel: "game",
    kind: "question",
    senderUid: "seeker",
    senderRole: "seeker",
    createdAt: "2026-01-01T11:55:00.000Z",
    status: "pending",
    promptText: "Near?",
    pendingQuestionId,
    toolType: "radar",
    replyOptions: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
    ...overrides,
  };
}

describe("selectPrimaryHiderAnswerTarget", () => {
  it("returns null when no open pending questions", () => {
    expect(
      selectPrimaryHiderAnswerTarget([], [], sessionRules, NOW),
    ).toBeNull();
  });

  it("pairs primary walking question with its game message", () => {
    const walkingPending = pending({
      id: "walk",
      status: "walking",
      toolType: "thermometer",
      answerableAt: undefined,
    });
    const laterPending = pending({
      id: "later",
      answerableAt: "2026-01-01T11:59:00.000Z",
    });

    const result = selectPrimaryHiderAnswerTarget(
      [laterPending, walkingPending],
      [
        questionMessage(laterPending.id),
        questionMessage(walkingPending.id, { toolType: "thermometer" }),
      ],
      sessionRules,
      NOW,
    );

    expect(result?.pending.id).toBe(walkingPending.id);
    expect(result?.message.pendingQuestionId).toBe(walkingPending.id);
  });

  it("returns null when primary pending has no linked question message", () => {
    expect(
      selectPrimaryHiderAnswerTarget(
        [pending({ id: "orphan" })],
        [],
        sessionRules,
        NOW,
      ),
    ).toBeNull();
  });

  it("prefers soonest deadline among pending (non-walking)", () => {
    const farFromExpiry = pending({
      id: "far",
      answerableAt: "2026-01-01T11:58:00.000Z",
    });
    const nearExpiry = pending({
      id: "near",
      answerableAt: "2026-01-01T11:50:00.000Z",
    });

    const result = selectPrimaryHiderAnswerTarget(
      [farFromExpiry, nearExpiry],
      [questionMessage(farFromExpiry.id), questionMessage(nearExpiry.id)],
      sessionRules,
      NOW,
    );

    expect(result?.pending.id).toBe(nearExpiry.id);
  });
});
