import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZERO_GAME_AREA } from "../../domain/geometry/core/gameAreaConvert";
import type { GameArea } from "../../domain/map/annotations";
import {
  PHOTO_REPLY_OPTIONS,
  type PhotoCategoryId,
  photoQuestionPrompt,
  radarQuestionPrompt,
} from "../../domain/questions";
import { questionOptionsForTool } from "../../domain/questions/randomizeQuestion";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import { buildRandomizedQuestion } from "./buildRandomizedQuestion";
import {
  resolveRandomizedMatching,
  resolveRandomizedTentacle,
} from "./resolveRandomizedHeavyQuestion";

vi.mock("./resolveRandomizedHeavyQuestion", () => ({
  resolveRandomizedMatching: vi.fn(async () => null),
  resolveRandomizedTentacle: vi.fn(async () => null),
}));

const session = { gameSize: "small" as const };
const pointGeometry = JSON.stringify({
  type: "Feature",
  properties: {},
  geometry: { type: "Point", coordinates: [-0.1, 51.5] },
});

function pending(overrides: Record<string, unknown> = {}): PendingQuestionRecord {
  return {
    id: "pq-1",
    toolType: "radar",
    status: "cancelled",
    cardDraw: 2,
    cardKeep: 1,
    placement: { geometryJson: pointGeometry, metadata: {} },
    ...overrides,
  } as unknown as PendingQuestionRecord;
}

const gameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.2, 51.4],
      [0, 51.4],
      [0, 51.6],
      [-0.2, 51.6],
      [-0.2, 51.4],
    ],
  ],
};

function ctx(
  pendingQuestions: readonly PendingQuestionRecord[] = [],
  overrides: { gameArea?: GameArea; session?: typeof session | { gameSize: "large" } } = {},
) {
  return {
    session: overrides.session ?? session,
    annotations: [],
    pendingQuestions,
    gameArea: overrides.gameArea ?? gameArea,
    distanceUnit: "imperial" as const,
  };
}

function heavyPayload(metadata: Record<string, unknown>) {
  return {
    promptText: "Heavy prompt",
    replyOptions: [{ id: "yes", label: "Yes" }],
    placement: { geometryJson: pointGeometry, metadata },
    cardDraw: 2,
    cardKeep: 1,
  };
}

describe("buildRandomizedQuestion", () => {
  beforeEach(() => {
    vi.mocked(resolveRandomizedMatching).mockReset().mockResolvedValue(null);
    vi.mocked(resolveRandomizedTentacle).mockReset().mockResolvedValue(null);
  });

  it("builds a radar submit at the rolled meters on the original center", async () => {
    const original = pending();
    const roll = questionOptionsForTool("radar", session)[1]!;
    const meters = roll.optionKey as number;

    const built = await buildRandomizedQuestion(original, roll, ctx([original]));

    expect(built.kind).toBe("submit");
    if (built.kind !== "submit") return;
    expect(built.toolType).toBe("radar");
    expect(built.input.placement.geometryJson).toBe(pointGeometry);
    expect(built.input.placement.metadata).toEqual({
      radiusMeters: roll.optionKey,
      radarChooseCustom: false,
      randomizedFrom: original.id,
    });
    expect(built.input.promptText).toBe(radarQuestionPrompt(meters, "imperial"));
    expect(built.input.replyOptions.map((option) => option.id)).toEqual(["yes", "no"]);
    expect(built.input.cardDraw).toBe(2);
    expect(built.input.cardKeep).toBe(1);
    expect(built.input.pendingQuestionId).toBe("pq-1~rnd");
  });

  it("ignores the hider label for the radar prompt", async () => {
    const original = pending();
    const meters = questionOptionsForTool("radar", session)[0]!.optionKey as number;

    const built = await buildRandomizedQuestion(
      original,
      { optionKey: meters, label: "<b>evil</b>" },
      ctx([original]),
    );

    expect(built.kind).toBe("submit");
    if (built.kind !== "submit") return;
    expect(built.input.promptText).toBe(radarQuestionPrompt(meters, "imperial"));
    expect(built.input.promptText).not.toContain("evil");
  });

  it.each([1234.5, Number.NaN])("falls back to manual for unknown radar key %s", async (key) => {
    const roll = { optionKey: key, label: "Mystery" };
    expect(await buildRandomizedQuestion(pending(), roll, ctx())).toEqual({
      kind: "manual",
      label: roll.label,
    });
  });

  it("falls back to manual with the catalog label when the radar distance is used", async () => {
    const original = pending();
    const option = questionOptionsForTool("radar", session)[1]!;
    const used = pending({
      id: "pq-0",
      status: "answered",
      placement: {
        geometryJson: pointGeometry,
        metadata: { radiusMeters: option.optionKey, radarChooseCustom: false },
      },
    });

    expect(
      await buildRandomizedQuestion(
        original,
        { optionKey: option.optionKey, label: "hider text" },
        ctx([used, original]),
      ),
    ).toStrictEqual({ kind: "manual", label: option.label });
  });

  it("builds a photo submit with an empty feature collection", async () => {
    const original = pending({ toolType: "photo" });
    const roll = questionOptionsForTool("photo", session)[0]!;

    const built = await buildRandomizedQuestion(original, roll, ctx([original]));

    expect(built.kind).toBe("submit");
    if (built.kind !== "submit") return;
    expect(built.toolType).toBe("photo");
    expect(JSON.parse(built.input.placement.geometryJson)).toEqual({
      type: "FeatureCollection",
      features: [],
    });
    expect(built.input.placement.metadata).toEqual({
      photoCategoryId: roll.optionKey,
      randomizedFrom: original.id,
    });
    expect(built.input.promptText).toBe(
      photoQuestionPrompt(roll.optionKey as PhotoCategoryId, "imperial"),
    );
    expect(built.input.replyOptions.map((option) => option.id)).toEqual(
      PHOTO_REPLY_OPTIONS.map((option) => option.id),
    );
    expect(built.input.cardDraw).toBe(2);
    expect(built.input.cardKeep).toBe(1);
    expect(built.input.pendingQuestionId).toBe("pq-1~rnd");
  });

  it("ignores the hider label for the photo prompt", async () => {
    const original = pending({ toolType: "photo" });
    const categoryId = questionOptionsForTool("photo", session)[0]!.optionKey as PhotoCategoryId;

    const built = await buildRandomizedQuestion(
      original,
      { optionKey: categoryId, label: "<b>evil</b>" },
      ctx([original]),
    );

    expect(built.kind).toBe("submit");
    if (built.kind !== "submit") return;
    expect(built.input.promptText).toBe(photoQuestionPrompt(categoryId, "imperial"));
    expect(built.input.promptText).not.toContain("evil");
  });

  it("falls back to manual with the catalog label when the photo category is used", async () => {
    const original = pending({ toolType: "photo" });
    const option = questionOptionsForTool("photo", session)[0]!;
    const used = pending({
      id: "pq-0",
      toolType: "photo",
      status: "answered",
      answer: { kind: "sent_externally" },
      placement: {
        geometryJson: pointGeometry,
        metadata: { photoCategoryId: option.optionKey },
      },
    });

    expect(
      await buildRandomizedQuestion(
        original,
        { optionKey: option.optionKey, label: "hider text" },
        ctx([used, original]),
      ),
    ).toStrictEqual({ kind: "manual", label: option.label });
  });

  it("returns the catalog label and preset key as manual for thermometer", async () => {
    const original = pending({ toolType: "thermometer" });
    const option = questionOptionsForTool("thermometer", session)[0]!;

    expect(
      await buildRandomizedQuestion(
        original,
        { optionKey: option.optionKey, label: "hider text" },
        ctx(),
      ),
    ).toStrictEqual({ kind: "manual", label: option.label, presetKey: option.optionKey });
  });

  it("submits the resolved matching payload at the original anchor", async () => {
    const original = pending({ toolType: "matching" });
    const option = questionOptionsForTool("matching", session)[0]!;
    vi.mocked(resolveRandomizedMatching).mockResolvedValue(
      heavyPayload({ matchingCategoryId: option.optionKey }),
    );

    const built = await buildRandomizedQuestion(original, option, ctx([original]));

    expect(resolveRandomizedMatching).toHaveBeenCalledWith(
      [51.5, -0.1],
      option.optionKey,
      { cardDraw: 2, cardKeep: 1 },
      expect.objectContaining({ gameArea, distanceUnit: "imperial" }),
    );
    expect(built.kind).toBe("submit");
    if (built.kind !== "submit") return;
    expect(built.toolType).toBe("matching");
    expect(built.input.promptText).toBe("Heavy prompt");
    expect(built.input.placement.metadata).toEqual({
      matchingCategoryId: option.optionKey,
      randomizedFrom: original.id,
    });
    expect(built.input.pendingQuestionId).toBe("pq-1~rnd");
  });

  it("returns the preset key when the matching resolver gives up", async () => {
    const original = pending({ toolType: "matching" });
    const option = questionOptionsForTool("matching", session)[0]!;

    expect(await buildRandomizedQuestion(original, option, ctx([original]))).toStrictEqual({
      kind: "manual",
      label: option.label,
      presetKey: option.optionKey,
    });
    expect(resolveRandomizedMatching).toHaveBeenCalledTimes(1);
  });

  it("returns the preset key without resolving while the play area is unresolved", async () => {
    const original = pending({ toolType: "matching" });
    const option = questionOptionsForTool("matching", session)[0]!;

    expect(
      await buildRandomizedQuestion(
        original,
        option,
        ctx([original], { gameArea: ZERO_GAME_AREA }),
      ),
    ).toStrictEqual({ kind: "manual", label: option.label, presetKey: option.optionKey });
    expect(resolveRandomizedMatching).not.toHaveBeenCalled();
  });

  it("returns the preset key without resolving when the original has no anchor", async () => {
    const original = pending({
      toolType: "matching",
      placement: { geometryJson: "", metadata: {} },
    });
    const option = questionOptionsForTool("matching", session)[0]!;

    expect(await buildRandomizedQuestion(original, option, ctx([original]))).toStrictEqual({
      kind: "manual",
      label: option.label,
      presetKey: option.optionKey,
    });
    expect(resolveRandomizedMatching).not.toHaveBeenCalled();
  });

  it("omits the preset key when the matching category is used", async () => {
    const original = pending({ toolType: "matching" });
    const option = questionOptionsForTool("matching", session)[0]!;
    const used = pending({
      id: "pq-0",
      toolType: "matching",
      status: "pending",
      placement: {
        geometryJson: pointGeometry,
        metadata: { matchingCategory: option.optionKey },
      },
    });

    expect(await buildRandomizedQuestion(original, option, ctx([used, original]))).toStrictEqual({
      kind: "manual",
      label: option.label,
    });
    expect(resolveRandomizedMatching).not.toHaveBeenCalled();
  });

  it("submits the resolved tentacle payload at the original anchor", async () => {
    const large = { gameSize: "large" as const };
    const original = pending({ toolType: "tentacle" });
    const option = questionOptionsForTool("tentacle", large)[0]!;
    vi.mocked(resolveRandomizedTentacle).mockResolvedValue(
      heavyPayload({ tentacleCategoryId: option.optionKey }),
    );

    const built = await buildRandomizedQuestion(
      original,
      option,
      ctx([original], { session: large }),
    );

    expect(resolveRandomizedTentacle).toHaveBeenCalledWith(
      [51.5, -0.1],
      option.optionKey,
      { cardDraw: 2, cardKeep: 1 },
      expect.objectContaining({ gameArea, distanceUnit: "imperial" }),
    );
    expect(built.kind).toBe("submit");
    if (built.kind !== "submit") return;
    expect(built.toolType).toBe("tentacle");
    expect(built.input.placement.metadata).toEqual({
      tentacleCategoryId: option.optionKey,
      randomizedFrom: original.id,
    });
    expect(built.input.pendingQuestionId).toBe("pq-1~rnd");
  });

  it("omits the preset key when the thermometer distance is used", async () => {
    const original = pending({ toolType: "thermometer" });
    const option = questionOptionsForTool("thermometer", session)[0]!;
    const used = pending({
      id: "pq-0",
      toolType: "thermometer",
      status: "pending",
      placement: {
        geometryJson: pointGeometry,
        metadata: { thermometerDistanceMeters: option.optionKey },
      },
    });

    expect(await buildRandomizedQuestion(original, option, ctx([used, original]))).toStrictEqual({
      kind: "manual",
      label: option.label,
    });
  });

  it("omits the preset key for an unknown key", async () => {
    const roll = { optionKey: "not-a-category", label: "Mystery" };

    expect(
      await buildRandomizedQuestion(pending({ toolType: "matching" }), roll, ctx()),
    ).toStrictEqual({ kind: "manual", label: roll.label });
  });
});
