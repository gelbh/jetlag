import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type ColumnMeta,
  defaultPrefs,
  normalizePrefs,
  prefsStorageKey,
  readPrefs,
  writePrefs,
} from "./adminTablePrefs";

const cols: ColumnMeta[] = [
  { id: "code", defaultVisible: true, pinned: true },
  { id: "area", defaultVisible: true },
  { id: "tier", defaultVisible: false },
];
const fallback = defaultPrefs(cols, { id: "area", dir: "desc" });

describe("admin table prefs", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("defaults to the default-visible columns with the pinned column first", () => {
    expect(fallback).toEqual({
      visible: ["code", "area"],
      sort: { id: "area", dir: "desc" },
      density: "comfortable",
    });
  });

  it("round-trips through localStorage", () => {
    const prefs = {
      visible: ["code", "tier", "area"],
      sort: { id: "tier", dir: "asc" as const },
      density: "compact" as const,
    };
    writePrefs("sessions", prefs);
    expect(localStorage.getItem(prefsStorageKey("sessions"))).not.toBeNull();
    expect(readPrefs("sessions", cols, fallback)).toEqual(prefs);
  });

  it("drops unknown ids, keeps the pinned column first and visible", () => {
    const out = normalizePrefs(
      { visible: ["area", "gone", "tier"], sort: { id: "gone", dir: "asc" }, density: "compact" },
      cols,
      fallback,
    );
    expect(out.visible).toEqual(["code", "area", "tier"]);
    expect(out.sort).toEqual(fallback.sort);
    expect(out.density).toBe("compact");
  });

  it("falls back on corrupt or wrong-shaped values", () => {
    localStorage.setItem(prefsStorageKey("sessions"), "{not json");
    expect(readPrefs("sessions", cols, fallback)).toEqual(fallback);
    expect(normalizePrefs({ visible: "x", density: "huge" }, cols, fallback)).toEqual(fallback);
  });

  it("survives storage that throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readPrefs("sessions", cols, fallback)).toEqual(fallback);
    expect(() => writePrefs("sessions", fallback)).not.toThrow();
  });
});
