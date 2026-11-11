import { beforeEach, describe, expect, it, vi } from "vitest";
import { isNoticeVisibleToUid, type SessionNoticeRecord } from "@/domain/session/opsNotice";

const dismissSessionNotice = vi.hoisted(() => vi.fn());
const captureException = vi.hoisted(() => vi.fn());

vi.mock("@/services/admin/adminSessionNotices", () => ({
  dismissSessionNotice,
}));

vi.mock("@/services/core/analytics/clientErrors", () => ({
  captureException,
}));

function notice(overrides: Partial<SessionNoticeRecord> = {}): SessionNoticeRecord {
  return {
    id: "n1",
    text: "Hello",
    tone: "info",
    createdAt: "2026-01-01T00:00:00.000Z",
    createdByUid: "admin-1",
    expiresAt: "2099-01-01T00:00:00.000Z",
    active: true,
    dismissedBy: {},
    ...overrides,
  };
}

describe("runSessionNoticeDismiss", () => {
  beforeEach(() => {
    dismissSessionNotice.mockReset();
    captureException.mockReset();
  });

  it("does not surface unhandled rejection when dismiss write is permission-denied", async () => {
    const { runSessionNoticeDismiss } = await import("./useSessionNotices");
    const error = Object.assign(new Error("Missing or insufficient permissions."), {
      name: "FirebaseError",
      code: "permission-denied",
    });
    dismissSessionNotice.mockRejectedValue(error);

    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      void runSessionNoticeDismiss("session-1", "notice-1", "uid-1");
      await Promise.resolve();
      await Promise.resolve();
      expect(unhandled).not.toHaveBeenCalled();
      expect(captureException).toHaveBeenCalledWith(error, {
        firestore_op: "write:dismissSessionNotice",
      });
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });
});

describe("session notice visibility", () => {
  it("hides expired notices", () => {
    expect(
      isNoticeVisibleToUid(
        notice({ expiresAt: "2020-01-01T00:00:00.000Z" }),
        "uid-1",
        Date.parse("2026-01-01T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("hides notices dismissed by the viewer", () => {
    expect(
      isNoticeVisibleToUid(
        notice({ dismissedBy: { "uid-1": "2026-01-01T00:00:00.000Z" } }),
        "uid-1",
        Date.parse("2026-06-01T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("shows active unexpired undismissed notices", () => {
    expect(isNoticeVisibleToUid(notice(), "uid-1", Date.parse("2026-06-01T00:00:00.000Z"))).toBe(
      true,
    );
  });
});
