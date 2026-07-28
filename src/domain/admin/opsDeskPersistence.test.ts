import { beforeEach, describe, expect, it } from "vitest";
import {
  CUSTOM_PRESET_ID,
  FORMER_BUILTIN_IDS,
  cloneLayout,
  defaultScratchLayout,
  layoutForFormerBuiltinId,
  type DeskLayout,
} from "./opsDeskLayout";
import {
  defaultOpsDeskStore,
  coldStartOpsDeskStore,
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

  it("cold-starts Scratch with no former builtin ids", () => {
    const store = defaultOpsDeskStore();
    expect(store.activePresetId).toBe(CUSTOM_PRESET_ID);
    expect(store.defaultPresetId).toBe(CUSTOM_PRESET_ID);
    expect(store.presetOrder).toEqual([CUSTOM_PRESET_ID]);
    for (const id of FORMER_BUILTIN_IDS) {
      expect(store.presetOrder).not.toContain(id);
    }
    expect(store.customLayout.stacks.map((s) => s.panelIds[0])).toEqual(
      defaultScratchLayout().stacks.map((s) => s.panelIds[0]),
    );
  });

  it("round-trips save/load without reintroducing builtins", () => {
    const overview = layoutForFormerBuiltinId("ops-overview")!;
    const store = defaultOpsDeskStore();
    store.activePresetId = CUSTOM_PRESET_ID;
    store.defaultPresetId = CUSTOM_PRESET_ID;
    store.customLayout = cloneLayout(overview);
    store.userPresets = [
      {
        id: "user-night",
        name: "Night shift",
        kind: "user",
        layout: cloneLayout(overview),
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
    expect(loaded.presetOrder).toEqual([CUSTOM_PRESET_ID, "user-night"]);
    expect(loaded.customLayout.stacks.map((s) => s.panelIds)).toEqual(
      store.customLayout.stacks.map((s) => s.panelIds),
    );
    expect(loaded.userPresets).toHaveLength(1);
    expect(loaded.userPresets[0]?.name).toBe("Night shift");
    expect(loaded.lastMobilePanelId).toBe("inbox");
  });

  it("migrates defaultPresetId session-watch to Scratch with cloned layout", () => {
    const expected = layoutForFormerBuiltinId("session-watch")!;
    localStorage.setItem(
      storageKey(null),
      JSON.stringify({
        version: 1,
        activePresetId: "session-watch",
        defaultPresetId: "session-watch",
        customLayout: {
          cols: 24,
          rowHeight: 24,
          stacks: [
            {
              id: "a",
              panelIds: ["inbox"],
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
        presetOrder: ["session-watch", "incident-triage", CUSTOM_PRESET_ID],
      }),
    );

    const loaded = loadOpsDeskStore(null);
    expect(loaded.activePresetId).toBe(CUSTOM_PRESET_ID);
    expect(loaded.defaultPresetId).toBe(CUSTOM_PRESET_ID);
    expect(loaded.presetOrder).toEqual([CUSTOM_PRESET_ID]);
    expect(loaded.customLayout.stacks.map((s) => s.panelIds)).toEqual(
      expected.stacks.map((s) => s.panelIds),
    );
  });

  it("migrates legacy 12-col stores and fills defaultPresetId as Scratch", () => {
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
    expect(loaded.defaultPresetId).toBe(CUSTOM_PRESET_ID);
    expect(loaded.presetOrder).toEqual([CUSTOM_PRESET_ID]);
    expect(loaded.customLayout.cols).toBe(24);
    expect(loaded.customLayout.stacks[0]).toMatchObject({ x: 0, w: 12 });
  });

  it("coldStartOpsDeskStore opens defaultPresetId after migrate", () => {
    localStorage.setItem(
      storageKey(null),
      JSON.stringify({
        version: 1,
        activePresetId: CUSTOM_PRESET_ID,
        defaultPresetId: "ops-overview",
        customLayout: defaultScratchLayout(),
        userPresets: [],
      }),
    );
    const started = coldStartOpsDeskStore(null);
    expect(started.defaultPresetId).toBe(CUSTOM_PRESET_ID);
    expect(started.activePresetId).toBe(CUSTOM_PRESET_ID);
    expect(started.customLayout.stacks.map((s) => s.panelIds)).toEqual(
      layoutForFormerBuiltinId("ops-overview")!.stacks.map((s) => s.panelIds),
    );
  });

  it("falls back invalid defaultPresetId to Scratch", () => {
    localStorage.setItem(
      storageKey(null),
      JSON.stringify({
        version: 1,
        activePresetId: CUSTOM_PRESET_ID,
        defaultPresetId: "missing-preset",
        customLayout: defaultScratchLayout(),
        userPresets: [],
      }),
    );
    const loaded = loadOpsDeskStore(null);
    expect(loaded.defaultPresetId).toBe(CUSTOM_PRESET_ID);
  });

  it("returns Scratch default on corrupt JSON", () => {
    localStorage.setItem(storageKey(null), "{not-json");
    const loaded = loadOpsDeskStore(null);
    expect(loaded).toEqual(defaultOpsDeskStore());
    expect(loaded.activePresetId).toBe(CUSTOM_PRESET_ID);
  });

  it("preserves optional monitor field on layouts", () => {
    const layout = defaultScratchLayout();
    layout.monitor = { cols: 8, stacks: [{ id: "map" }] };
    saveOpsDeskStore(null, {
      version: 1,
      activePresetId: CUSTOM_PRESET_ID,
      defaultPresetId: CUSTOM_PRESET_ID,
      presetOrder: [CUSTOM_PRESET_ID],
      customLayout: layout,
      userPresets: [],
    });
    const loaded = loadOpsDeskStore(null);
    expect(loaded.customLayout.monitor).toEqual({
      cols: 8,
      stacks: [{ id: "map" }],
    });
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
        ...FORMER_BUILTIN_IDS,
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
    expect(loaded.presetOrder).toEqual([CUSTOM_PRESET_ID, "user-x"]);
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
