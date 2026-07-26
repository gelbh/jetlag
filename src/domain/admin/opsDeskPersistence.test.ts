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
    store.defaultPresetId = CUSTOM_PRESET_ID;
    store.customLayout = cloneLayout(OPS_OVERVIEW_LAYOUT);
    store.userPresets = [
      {
        id: "user-night",
        name: "Night shift",
        kind: "user",
        layout: cloneLayout(OPS_OVERVIEW_LAYOUT),
      },
    ];
    store.presetOrder = [
      "ops-overview",
      CUSTOM_PRESET_ID,
      "user-night",
      "session-watch",
      "incident-triage",
    ];
    store.lastMobilePanelId = "inbox";

    saveOpsDeskStore("alice", store);
    const loaded = loadOpsDeskStore("alice");

    expect(loaded.activePresetId).toBe(CUSTOM_PRESET_ID);
    expect(loaded.defaultPresetId).toBe(CUSTOM_PRESET_ID);
    expect(loaded.presetOrder[0]).toBe("ops-overview");
    expect(loaded.customLayout.stacks.map((s) => s.panelIds)).toEqual(
      store.customLayout.stacks.map((s) => s.panelIds),
    );
    expect(loaded.userPresets).toHaveLength(1);
    expect(loaded.userPresets[0]?.name).toBe("Night shift");
    expect(loaded.lastMobilePanelId).toBe("inbox");
  });

  it("migrates legacy 12-col stores and fills defaultPresetId", () => {
    localStorage.setItem(
      storageKey(null),
      JSON.stringify({
        version: 1,
        activePresetId: CUSTOM_PRESET_ID,
        customLayout: {
          cols: 12,
          rowHeight: 36,
          stacks: [
            {
              id: "a",
              panelIds: ["sessions"],
              activeIndex: 0,
              x: 0,
              y: 0,
              w: 6,
              h: 4,
            },
          ],
          hiddenPanelIds: [],
        },
        userPresets: [],
      }),
    );

    const loaded = loadOpsDeskStore(null);
    expect(loaded.defaultPresetId).toBe(BUILTIN_PRESETS[0]!.id);
    expect(loaded.presetOrder).toContain(CUSTOM_PRESET_ID);
    expect(loaded.customLayout.cols).toBe(24);
    expect(loaded.customLayout.stacks[0]).toMatchObject({ x: 0, w: 12 });
  });

  it("falls back invalid defaultPresetId to builtin", () => {
    localStorage.setItem(
      storageKey(null),
      JSON.stringify({
        version: 1,
        activePresetId: "session-watch",
        defaultPresetId: "missing-preset",
        customLayout: cloneLayout(OPS_OVERVIEW_LAYOUT),
        userPresets: [],
      }),
    );
    const loaded = loadOpsDeskStore(null);
    expect(loaded.defaultPresetId).toBe(BUILTIN_PRESETS[0]!.id);
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
      defaultPresetId: CUSTOM_PRESET_ID,
      presetOrder: [
        ...BUILTIN_PRESETS.map((p) => p.id),
        CUSTOM_PRESET_ID,
        "user-x",
      ],
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
