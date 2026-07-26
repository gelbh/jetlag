import { describe, expect, it } from "vitest";
import {
  OPS_OVERVIEW_LAYOUT,
  cloneLayout,
  deleteUserPreset,
  upsertUserPreset,
} from "./opsDeskLayout";

describe("opsDeskPresets", () => {
  it("rejects empty preset names", () => {
    const result = upsertUserPreset([], "   ", cloneLayout(OPS_OVERVIEW_LAYOUT));
    expect(result).toEqual({ ok: false, reason: "empty-name" });
  });

  it("saves a named user preset", () => {
    const layout = cloneLayout(OPS_OVERVIEW_LAYOUT);
    const result = upsertUserPreset([], "Morning triage", layout);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preset.name).toBe("Morning triage");
    expect(result.preset.kind).toBe("user");
    expect(result.presets).toHaveLength(1);
  });

  it("overwrites an existing preset by id", () => {
    const first = upsertUserPreset([], "A", cloneLayout(OPS_OVERVIEW_LAYOUT));
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const nextLayout = cloneLayout(OPS_OVERVIEW_LAYOUT);
    nextLayout.stacks[0]!.w = 8;
    const second = upsertUserPreset(first.presets, "A renamed", nextLayout, {
      overwriteId: first.preset.id,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.presets).toHaveLength(1);
    expect(second.preset.name).toBe("A renamed");
    expect(second.preset.layout.stacks[0]?.w).toBe(8);
  });

  it("deletes a user preset by id", () => {
    const saved = upsertUserPreset([], "Temp", cloneLayout(OPS_OVERVIEW_LAYOUT));
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(deleteUserPreset(saved.presets, saved.preset.id)).toEqual([]);
  });
});
