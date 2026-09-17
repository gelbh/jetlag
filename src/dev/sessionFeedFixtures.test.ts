import { describe, expect, it } from "vitest";
import {
  buildMockActivityEvents,
  buildMockChatMessages,
  buildMockPendingQuestions,
  MOCK_SESSION_FEED_ID,
} from "./sessionFeedFixtures";

describe("sessionFeedFixtures", () => {
  it("builds stable non-empty chat, pending, and activity fixtures", () => {
    const messages = buildMockChatMessages(MOCK_SESSION_FEED_ID);
    const pending = buildMockPendingQuestions(MOCK_SESSION_FEED_ID);
    const events = buildMockActivityEvents(MOCK_SESSION_FEED_ID);

    expect(messages.length).toBeGreaterThan(0);
    expect(pending.length).toBeGreaterThan(0);
    expect(events.length).toBeGreaterThan(0);
    expect(new Set(messages.map((m) => m.id)).size).toBe(messages.length);
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });
});
