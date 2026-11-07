import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildNoticeDocument,
  clampNoticeTtlSeconds,
  normalizeNoticeText,
  normalizeNoticeTone,
  SESSION_NOTICE_TEXT_MAX,
  SESSION_NOTICE_TTL_DEFAULT,
} from "../admin/publishSessionNotice.mjs";

describe("publishSessionNotice helpers", () => {
  it("clamps ttl to 10–120 with default 30", () => {
    assert.equal(clampNoticeTtlSeconds(undefined), SESSION_NOTICE_TTL_DEFAULT);
    assert.equal(clampNoticeTtlSeconds(5), 10);
    assert.equal(clampNoticeTtlSeconds(200), 120);
    assert.equal(clampNoticeTtlSeconds(45.6), 46);
  });

  it("normalizes notice text", () => {
    assert.equal(normalizeNoticeText("  hello  "), "hello");
    assert.equal(normalizeNoticeText(""), null);
    assert.equal(normalizeNoticeText("x".repeat(SESSION_NOTICE_TEXT_MAX + 1)), null);
  });

  it("normalizes tone", () => {
    assert.equal(normalizeNoticeTone(undefined), "info");
    assert.equal(normalizeNoticeTone("warn"), "warn");
    assert.equal(normalizeNoticeTone("loud"), null);
  });

  it("builds notice with expiry and optional supersede", () => {
    const notice = buildNoticeDocument({
      text: "Board fixed",
      tone: "info",
      ttlSeconds: 30,
      createdByUid: "admin-1",
      createdAt: "2026-11-07T18:00:00.000Z",
      supersedesNoticeId: "old-1",
    });
    assert.equal(notice.active, true);
    assert.equal(notice.expiresAt, "2026-11-07T18:00:30.000Z");
    assert.equal(notice.supersedesNoticeId, "old-1");
    assert.deepEqual(notice.dismissedBy, {});
  });
});
