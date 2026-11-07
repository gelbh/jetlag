import { describe, expect, it } from "vitest";
import { isNoticeVisibleToUid, type SessionNoticeRecord } from "@/domain/session/opsNotice";

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
