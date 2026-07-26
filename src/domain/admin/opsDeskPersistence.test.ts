import { beforeEach, describe, expect, it } from "vitest";
import {
  BUILTIN_PRESETS,
  CUSTOM_PRESET_ID,
  OPS_OVERVIEW_LAYOUT,
  cloneLayout,
  type DeskLayout,
} from "./opsDeskLayout";
import {
  defaultOpsDeskStore,
  loadOpsDeskStore,
  saveOpsDeskStore,
  storageKey,
} from "./opsDeskPersistence";

describe("opsDeskPersistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("builds storage keys with optional uid suffix", () => {
    expect(storageKey(null)).toBe("jetlag.adminOpsDesk.v1");
    expect(storageKey("uid-abc")).toBe("jetlag.adminOpsDesk.v1:uid-abc");
  });

  it("round-trips save/load", () => {
    const store = defaultOpsDeskStore();
    store.activePresetId = CUSTOM_PRESET_ID;
    store.customLayout = cloneLayout(OPS_OVERVIEW_LAYOUT);
    store.userPresets = [
      {
        id: "user-night",
        name: "Night shift",
        kind: "user",
        layout: cloneLayout(OPS_OVERVIEW_LAYOUT),
      },
    ];
    store.lastMobilePanelId = "inbox";

    saveOpsDeskStore("alice", store);
    const loaded = loadOpsDeskStore("alice");

    expect(loaded.activePresetId).toBe(CUSTOM_PRESET_ID);
    expect(loaded.customLayout.stacks.map((s) => s.panelIds)).toEqual(
      store.customLayout.stacks.map((s) => s.panelIds),
    );
    expect(loaded.userPresets).toHaveLength(1);
    expect(loaded.userPresets[0]?.name).toBe("Night shift");
    expect(loaded.lastMobilePanelId).toBe("inbox");
  });

  it("returns builtins default on corrupt JSON", () => {
    localStorage.setItem(storageKey(null), "{not-json");
    const loaded = loadOpsDeskStore(null);
    expect(loaded).toEqual(defaultOpsDeskStore());
    expect(loaded.activePresetId).toBe(BUILTIN_PRESETS[0]!.id);
  });

  it("strips unknown panel ids from stacks and hidden lists", () => {
    const layout: DeskLayout = {
      cols: 12,
      rowHeight: 36,
      stacks: [
        {
          id: "a",
          panelIds: ["sessions", "fantasy-lookup" as never, "inbox"],
          activeIndex: 2,
          x: 0,
          y: 0,
          w: 6,
          h: 4,
        },
        {
          id: "b",
          panelIds: ["not-a-panel" as never],
          activeIndex: 0,
          x: 6,
          y: 0,
          w: 6,
          h: 4,
        },
      ],
      hiddenPanelIds: ["settings", "bogus" as never],
    };

    saveOpsDeskStore(null, {
      version: 1,
      activePresetId: CUSTOM_PRESET_ID,
      customLayout: layout,
      userPresets: [
        {
          id: "user-x",
          name: "X",
          kind: "user",
          layout,
        },
      ],
    });

    const loaded = loadOpsDeskStore(null);
    expect(loaded.customLayout.stacks).toHaveLength(1);
    expect(loaded.customLayout.stacks[0]?.panelIds).toEqual([
      "sessions",
      "inbox",
    ]);
    expect(loaded.customLayout.hiddenPanelIds).toEqual(["settings"]);
    expect(loaded.userPresets[0]?.layout.stacks[0]?.panelIds).toEqual([
      "sessions",
      "inbox",
    ]);
  });
});
