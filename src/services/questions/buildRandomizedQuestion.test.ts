import { describe, expect, it } from "vitest";
import {
  PHOTO_REPLY_OPTIONS,
  type PhotoCategoryId,
  photoQuestionPrompt,
  radarQuestionPrompt,
} from "../../domain/questions";
import { questionOptionsForTool } from "../../domain/questions/randomizeQuestion";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import { buildRandomizedQuestion } from "./buildRandomizedQuestion";

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

function ctx(pendingQuestions: readonly PendingQuestionRecord[] = []) {
  return { session, annotations: [], pendingQuestions };
}

describe("buildRandomizedQuestion", () => {
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

  it("returns the preset key for an unused matching roll", async () => {
    const original = pending({ toolType: "matching" });
    const option = questionOptionsForTool("matching", session)[0]!;

    expect(await buildRandomizedQuestion(original, option, ctx([original]))).toStrictEqual({
      kind: "manual",
      label: option.label,
      presetKey: option.optionKey,
    });
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
