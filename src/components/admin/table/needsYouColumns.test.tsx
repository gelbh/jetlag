import { describe, expect, it } from "vitest";
import { defaultPrefs } from "@/domain/admin/adminTablePrefs";
import { sortAdminRows } from "./AdminDataTable";
import { buildNeedsYouColumns, NEEDS_YOU_DEFAULT_SORT } from "./needsYouColumns";
import type { NeedsYouRow } from "./needsYouRows";

function row(key: string, createdAt: string): NeedsYouRow {
  return {
    key,
    kind: "incident",
    code: null,
    summary: key,
    status: { tone: "neutral", label: "New" },
    open: true,
    reporterRole: null,
    updatedAt: createdAt,
    createdAt,
    agent: null,
    appVersion: null,
    platform: null,
  };
}

describe("buildNeedsYouColumns", () => {
  it("shows the spec defaults with Code pinned first", () => {
    const columns = buildNeedsYouColumns();
    expect(columns.map((c) => c.id)).toEqual([
      "kind",
      "code",
      "summary",
      "status",
      "reporterRole",
      "age",
      "agent",
      "appVersion",
      "platform",
    ]);
    const prefs = defaultPrefs(columns, NEEDS_YOU_DEFAULT_SORT);
    expect(prefs.visible).toEqual(["code", "kind", "summary", "status", "reporterRole", "age"]);
    expect(prefs.sort).toEqual({ id: "age", dir: "asc" });
  });

  it("sorts age ascending by createdAt, oldest first", () => {
    const column = buildNeedsYouColumns().find((c) => c.id === "age");
    const rows = [
      row("new", "2026-10-18T10:00:00.000Z"),
      row("old", "2026-10-16T10:00:00.000Z"),
      row("mid", "2026-10-17T10:00:00.000Z"),
    ];
    expect(sortAdminRows(rows, column, "asc").map((r) => r.key)).toEqual(["old", "mid", "new"]);
  });
});
