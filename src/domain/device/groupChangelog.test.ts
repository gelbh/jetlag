import { describe, expect, it } from "vitest";
import type { ChangelogEntry } from "./changelog";
import {
  buildGroupSummary,
  filterUserFacingChangelog,
  groupChangelogEntries,
} from "./groupChangelog";

function entry(
  version: string,
  date: string,
  sections: ChangelogEntry["sections"],
): ChangelogEntry {
  return { version, date, sections };
}

describe("filterUserFacingChangelog", () => {
  it("drops Technical-only entries", () => {
    const filtered = filterUserFacingChangelog([
      entry("0.5.8", "2026-07-12", [{ title: "Technical", items: ["CI only"] }]),
      entry("0.5.7", "2026-07-12", [
        { title: "Fixes", items: ["Bug fix"] },
        { title: "Technical", items: ["Internal"] },
      ]),
    ]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.version).toBe("0.5.7");
    expect(filtered[0]?.sections.map((section) => section.title)).toEqual([
      "Fixes",
    ]);
  });
});

describe("buildGroupSummary", () => {
  it("prefers Improvements, then Fixes, capped at 5 and skips Technical", () => {
    const summary = buildGroupSummary([
      entry("0.8.1", "2026-07-17", [
        { title: "Improvements", items: ["imp-newest"] },
        { title: "Fixes", items: ["fix-newest"] },
      ]),
      entry("0.8.0", "2026-07-16", [
        { title: "Fixes", items: ["fix-a", "fix-b"] },
        { title: "Improvements", items: ["imp-a", "imp-b", "imp-c"] },
        { title: "Technical", items: ["tech"] },
      ]),
    ]);

    expect(summary).toEqual([
      "imp-newest",
      "imp-a",
      "imp-b",
      "imp-c",
      "fix-newest",
    ]);
  });
});

describe("groupChangelogEntries", () => {
  it("keeps only the current minor flat when no older minors exist", () => {
    const nodes = groupChangelogEntries([
      entry("0.8.1", "2026-07-17", [{ title: "Fixes", items: ["a"] }]),
      entry("0.8.0", "2026-07-16", [{ title: "Fixes", items: ["b"] }]),
    ]);

    expect(nodes).toEqual([
      { kind: "version", entry: expect.objectContaining({ version: "0.8.1" }) },
      { kind: "version", entry: expect.objectContaining({ version: "0.8.0" }) },
    ]);
  });

  it("groups closed minors while the current minor stays flat", () => {
    const nodes = groupChangelogEntries([
      entry("0.8.1", "2026-07-17", [{ title: "Fixes", items: ["current patch"] }]),
      entry("0.8.0", "2026-07-16", [{ title: "Fixes", items: ["older patch"] }]),
      entry("0.7.1", "2026-07-15", [{ title: "Fixes", items: ["closed minor patch"] }]),
      entry("0.7.0", "2026-07-14", [{ title: "Improvements", items: ["closed minor base"] }]),
    ]);

    expect(nodes.map((node) => node.kind)).toEqual([
      "version",
      "version",
      "minorGroup",
    ]);
    expect(nodes[0]).toMatchObject({ kind: "version", entry: { version: "0.8.1" } });
    expect(nodes[1]).toMatchObject({ kind: "version", entry: { version: "0.8.0" } });
    expect(nodes[2]).toMatchObject({
      kind: "minorGroup",
      label: "0.7",
      date: "2026-07-15",
      children: [
        expect.objectContaining({ version: "0.7.1" }),
        expect.objectContaining({ version: "0.7.0" }),
      ],
    });
  });

  it("never wraps major 0 into a single major group when 1.x starts", () => {
    const nodes = groupChangelogEntries([
      entry("1.0.0", "2026-08-01", [{ title: "Improvements", items: ["v1"] }]),
      entry("0.8.1", "2026-07-17", [{ title: "Fixes", items: ["0.8 patch"] }]),
      entry("0.8.0", "2026-07-16", [{ title: "Fixes", items: ["0.8 base"] }]),
      entry("0.7.0", "2026-07-14", [{ title: "Fixes", items: ["0.7 base"] }]),
    ]);

    expect(nodes.map((node) => node.kind)).toEqual([
      "version",
      "minorGroup",
      "minorGroup",
    ]);
    expect(nodes.some((node) => node.kind === "majorGroup")).toBe(false);
    expect(nodes[1]).toMatchObject({ kind: "minorGroup", label: "0.8" });
    expect(nodes[2]).toMatchObject({ kind: "minorGroup", label: "0.7" });
  });

  it("wraps closed majors once the next major exists", () => {
    const nodes = groupChangelogEntries([
      entry("2.0.0", "2026-09-01", [{ title: "Improvements", items: ["v2"] }]),
      entry("1.1.1", "2026-08-15", [{ title: "Fixes", items: ["1.1 patch"] }]),
      entry("1.1.0", "2026-08-10", [{ title: "Improvements", items: ["1.1 base"] }]),
      entry("1.0.0", "2026-08-01", [{ title: "Improvements", items: ["1.0 base"] }]),
    ]);

    expect(nodes.map((node) => node.kind)).toEqual(["version", "majorGroup"]);
    expect(nodes[1]).toMatchObject({
      kind: "majorGroup",
      label: "1",
      date: "2026-08-15",
      children: [
        expect.objectContaining({ kind: "minorGroup", label: "1.1" }),
        expect.objectContaining({ kind: "minorGroup", label: "1.0" }),
      ],
    });
  });

  it("omits entries that only contain Technical sections", () => {
    const nodes = groupChangelogEntries([
      entry("0.8.1", "2026-07-17", [{ title: "Fixes", items: ["visible"] }]),
      entry("0.8.0", "2026-07-16", [{ title: "Technical", items: ["hidden"] }]),
    ]);

    expect(nodes).toEqual([
      { kind: "version", entry: expect.objectContaining({ version: "0.8.1" }) },
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(groupChangelogEntries([])).toEqual([]);
  });

  it("throws for a malformed version string", () => {
    expect(() =>
      groupChangelogEntries([
        entry("0.8", "2026-07-17", [{ title: "Fixes", items: ["a"] }]),
      ]),
    ).toThrow(/Invalid changelog version/);
  });

  it("sorts out-of-order input before grouping majors", () => {
    const nodes = groupChangelogEntries([
      entry("1.0.0", "2026-06-01", [{ title: "Fixes", items: ["old major"] }]),
      entry("2.0.0", "2026-07-01", [{ title: "Fixes", items: ["newest"] }]),
      entry("1.1.0", "2026-06-15", [{ title: "Improvements", items: ["newer minor"] }]),
    ]);

    expect(nodes.map((node) => node.kind)).toEqual(["version", "majorGroup"]);
    expect(nodes[1]).toEqual(
      expect.objectContaining({
        kind: "majorGroup",
        label: "1",
        children: [
          expect.objectContaining({ kind: "minorGroup", label: "1.1" }),
          expect.objectContaining({ kind: "minorGroup", label: "1.0" }),
        ],
      }),
    );
  });
});
