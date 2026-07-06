import { describe, expect, it } from "vitest";
import {
  collectUnreadFingerprints,
  hasUnreadChatMessages,
  isUnreadEligibleMessage,
  messageFingerprint,
} from "./chatUnread";
import type { SessionMessageRecord } from "./sessionChat";

const seekerUid = "seeker-1";
const hiderUid = "hider-1";

function socialMessage(
  overrides: Partial<SessionMessageRecord> = {},
): SessionMessageRecord {
  return {
    id: "msg-social",
    sessionId: "session-1",
    channel: "social",
    senderUid: hiderUid,
    senderRole: "hider",
    createdAt: "2026-01-01T00:00:00.000Z",
    text: "Hello",
    ...overrides,
  };
}

function gameQuestion(
  overrides: Partial<SessionMessageRecord> = {},
): SessionMessageRecord {
  return {
    id: "msg-question",
    sessionId: "session-1",
    channel: "game",
    senderUid: seekerUid,
    senderRole: "seeker",
    createdAt: "2026-01-01T00:00:00.000Z",
    kind: "question",
    pendingQuestionId: "pq-1",
    toolType: "radar",
    promptText: "Are you within range?",
    status: "pending",
    ...overrides,
  };
}

describe("messageFingerprint", () => {
  it("changes when answer status updates", () => {
    const pending = gameQuestion({ status: "pending" });
    const answered = gameQuestion({
      status: "answered",
      selectedReply: "yes",
    });

    expect(messageFingerprint(pending)).not.toBe(messageFingerprint(answered));
  });
});

describe("isUnreadEligibleMessage", () => {
  it("treats social messages from others as eligible", () => {
    expect(isUnreadEligibleMessage(socialMessage(), hiderUid)).toBe(false);
    expect(isUnreadEligibleMessage(socialMessage(), seekerUid)).toBe(true);
  });

  it("treats new game questions from others as eligible", () => {
    expect(isUnreadEligibleMessage(gameQuestion(), hiderUid)).toBe(true);
    expect(isUnreadEligibleMessage(gameQuestion(), seekerUid)).toBe(false);
  });

  it("treats answered game questions as eligible for the seeker", () => {
    const answered = gameQuestion({
      status: "answered",
      selectedReply: "yes",
    });

    expect(isUnreadEligibleMessage(answered, seekerUid)).toBe(true);
    expect(isUnreadEligibleMessage(answered, hiderUid)).toBe(false);
  });

  it("ignores system game messages", () => {
    const system = gameQuestion({
      kind: "system",
      text: "Timer paused",
      promptText: undefined,
    });

    expect(isUnreadEligibleMessage(system, hiderUid)).toBe(false);
  });
});

describe("hasUnreadChatMessages", () => {
  it("detects unread social messages from others", () => {
    expect(
      hasUnreadChatMessages([socialMessage()], seekerUid, new Set()),
    ).toBe(true);
  });

  it("ignores own social messages", () => {
    expect(
      hasUnreadChatMessages(
        [socialMessage({ senderUid: seekerUid, senderRole: "seeker" })],
        seekerUid,
        new Set(),
      ),
    ).toBe(false);
  });

  it("detects new game questions for the hider", () => {
    expect(hasUnreadChatMessages([gameQuestion()], hiderUid, new Set())).toBe(
      true,
    );
  });

  it("detects answered questions for the seeker", () => {
    const answered = gameQuestion({
      status: "answered",
      selectedReply: "yes",
    });

    expect(
      hasUnreadChatMessages([answered], seekerUid, new Set()),
    ).toBe(true);
  });

  it("returns false when fingerprints are acknowledged", () => {
    const message = socialMessage();
    const acknowledged = new Set([messageFingerprint(message)]);

    expect(
      hasUnreadChatMessages([message], seekerUid, acknowledged),
    ).toBe(false);
  });

  it("collects multiple unread fingerprints", () => {
    const unread = collectUnreadFingerprints(
      [socialMessage(), gameQuestion()],
      hiderUid,
      new Set(),
    );

    expect(unread).toHaveLength(1);
    expect(unread[0]).toBe(messageFingerprint(gameQuestion()));
  });
});
