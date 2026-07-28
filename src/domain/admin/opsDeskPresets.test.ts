import { describe, expect, it } from "vitest";
import {
  CUSTOM_PRESET_ID,
  cloneLayout,
  defaultScratchLayout,
  deleteUserPreset,
  layoutForFormerBuiltinId,
  movePresetOntoId,
  movePresetOrder,
  movePresetToIndex,
  presetLabel,
  upsertUserPreset,
} from "./opsDeskLayout";

describe("opsDeskPresets", () => {
  it("rejects empty preset names", () => {
    const result = upsertUserPreset([], "   ", defaultScratchLayout());
    expect(result).toEqual({ ok: false, reason: "empty-name" });
  });

  it("saves a named user preset", () => {
    const layout = defaultScratchLayout();
    const result = upsertUserPreset([], "Morning triage", layout);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preset.name).toBe("Morning triage");
    expect(result.preset.kind).toBe("user");
    expect(result.presets).toHaveLength(1);
  });

  it("overwrites an existing preset by id", () => {
    const first = upsertUserPreset([], "A", defaultScratchLayout());
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const nextLayout = defaultScratchLayout();
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
    const saved = upsertUserPreset([], "Temp", defaultScratchLayout());
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(deleteUserPreset(saved.presets, saved.preset.id)).toEqual([]);
  });

  it("labels Scratch and user presets (not former builtins)", () => {
    expect(presetLabel(CUSTOM_PRESET_ID, [])).toBe("Scratch");
    expect(presetLabel("session-watch", [])).toBe("session-watch");
    expect(presetLabel("unknown", [])).toBe("unknown");
    expect(
      presetLabel("user-a", [
        {
          id: "user-a",
          name: "Night",
          kind: "user",
          layout: defaultScratchLayout(),
        },
      ]),
    ).toBe("Night");
  });

  it("moves presets by delta and by index", () => {
    const order = ["a", "b", "c"];
    expect(movePresetOrder(order, "b", -1)).toEqual(["b", "a", "c"]);
    expect(movePresetToIndex(order, "a", 2)).toEqual(["b", "c", "a"]);
    expect(movePresetOrder(order, "a", -1)).toBeNull();
    expect(movePresetToIndex(order, "a", 0)).toBeNull();
    expect(movePresetOrder(order, "missing", 1)).toBeNull();
    expect(movePresetToIndex(order, "a", 3)).toBeNull();
    expect(movePresetToIndex(order, "a", 1.5)).toBeNull();
    expect(movePresetOrder(order, "a", 1.5)).toBeNull();
    expect(movePresetOrder(order, "a", Number.NaN)).toBeNull();
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("drops onto a target without forward off-by-one", () => {
    const order = ["custom", "user-a", "user-b", "user-c"];
    expect(movePresetOntoId(order, "custom", "user-b")).toEqual([
      "user-a",
      "custom",
      "user-b",
      "user-c",
    ]);
    expect(movePresetOntoId(order, "user-c", "custom")).toEqual([
      "user-c",
      "custom",
      "user-a",
      "user-b",
    ]);
    expect(movePresetOntoId(order, "custom", "custom")).toBeNull();
    expect(movePresetOntoId(order, "missing", "user-b")).toBeNull();
    expect(order).toEqual(["custom", "user-a", "user-b", "user-c"]);
  });

  it("exposes former builtin layouts for migrate only", () => {
    const triage = layoutForFormerBuiltinId("incident-triage");
    expect(triage?.stacks.map((s) => s.panelIds[0])).toEqual([
      "inbox",
      "detail",
      "actions",
    ]);
    expect(cloneLayout(triage!).stacks[0]?.panelIds).toEqual(["inbox"]);
  });
});
