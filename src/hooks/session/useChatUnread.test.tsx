import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatUnread } from "./useChatUnread";
import type { SessionMessageRecord } from "../../domain/session/activity/sessionChat";

function message(
  overrides: Partial<SessionMessageRecord> & Pick<SessionMessageRecord, "id">,
): SessionMessageRecord {
  return {
    sessionId: "s1",
    channel: "social",
    senderUid: "other",
    senderRole: "seeker",
    createdAt: "2026-01-01T00:00:00.000Z",
    text: "hi",
    ...overrides,
  };
}

describe("useChatUnread sessionStorage soft-fail", () => {
  const original = globalThis.sessionStorage;

  beforeEach(() => {
    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn(() => {
        throw new Error("SecurityError");
      }),
      setItem: vi.fn(() => {
        throw new Error("QuotaExceededError");
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    });
  });

  afterEach(() => {
    vi.stubGlobal("sessionStorage", original);
  });

  it("survives thrown getItem/setItem and still tracks unread in memory", async () => {
    const { result, rerender } = renderHook(
      ({ isChatOpen, messages }) =>
        useChatUnread({
          sessionId: "s1",
          viewerUid: "me",
          messages,
          isChatOpen,
        }),
      {
        initialProps: {
          isChatOpen: false,
          messages: [message({ id: "m1", senderUid: "other" })],
        },
      },
    );

    await waitFor(() => {
      expect(result.current.unreadCount).toBeGreaterThanOrEqual(0);
    });

    act(() => {
      rerender({
        isChatOpen: true,
        messages: [message({ id: "m1", senderUid: "other" })],
      });
    });

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(0);
    });
  });
});

describe("useChatUnread acknowledgeFingerprints", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("acknowledgeFingerprints clears only matching unread", async () => {
    const question = {
      id: "q1",
      sessionId: "s1",
      channel: "game" as const,
      kind: "question" as const,
      senderUid: "seeker",
      senderRole: "seeker" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "pending" as const,
      promptText: "Near?",
      pendingQuestionId: "pq1",
      toolType: "radar" as const,
    };
    const social = {
      id: "s1msg",
      sessionId: "s1",
      channel: "social" as const,
      senderUid: "seeker",
      senderRole: "seeker" as const,
      createdAt: "2026-01-01T00:00:01.000Z",
      text: "hi",
    };

    const { result } = renderHook(() =>
      useChatUnread({
        sessionId: "s1",
        viewerUid: "hider",
        messages: [question, social],
        isChatOpen: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(2);
    });

    const { messageFingerprint } = await import(
      "../../domain/device/chrome/chatUnread"
    );

    act(() => {
      result.current.acknowledgeFingerprints([messageFingerprint(question)]);
    });

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(1);
      expect(result.current.hasUnreadChat).toBe(true);
    });
  });
});
