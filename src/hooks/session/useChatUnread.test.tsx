import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatUnread } from "./useChatUnread";
import type { SessionMessageRecord } from "../../domain/session/sessionChat";

function message(
  partial: Partial<SessionMessageRecord> & Pick<SessionMessageRecord, "id">,
): SessionMessageRecord {
  return {
    id: partial.id,
    type: partial.type ?? "text",
    text: partial.text ?? "hi",
    senderUid: partial.senderUid ?? "other",
    createdAt: partial.createdAt ?? 1,
    ...partial,
  } as SessionMessageRecord;
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
