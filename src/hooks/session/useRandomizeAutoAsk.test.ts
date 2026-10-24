import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import { questionOptionsForTool } from "@/domain/questions/randomizeQuestion";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import { JOIN_PREVIEW_PLACEHOLDER_AREA } from "@/domain/session/join/joinPreviewGameArea";
import {
  resolveRandomizedMatching,
  resolveRandomizedMeasuring,
} from "@/services/questions/resolveRandomizedHeavyQuestion";
import {
  nextRandomizedQuestion,
  type UseRandomizeAutoAskParams,
  useRandomizeAutoAsk,
} from "./useRandomizeAutoAsk";

vi.mock("@/services/questions/resolveRandomizedHeavyQuestion", () => ({
  resolveRandomizedMatching: vi.fn(async () => null),
  resolveRandomizedMeasuring: vi.fn(async () => null),
  resolveRandomizedTentacle: vi.fn(async () => null),
}));

const session = { gameSize: "small" as const };
const [radarOriginalOption, radarRoll] = questionOptionsForTool("radar", session);
const [thermometerRoll] = questionOptionsForTool("thermometer", session);
const [matchingRoll] = questionOptionsForTool("matching", session);
const [measuringRoll] = questionOptionsForTool("measuring", session);
const gameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.3, 53.3],
      [-6.2, 53.3],
      [-6.2, 53.4],
      [-6.3, 53.4],
      [-6.3, 53.3],
    ],
  ],
};

function radarOriginal(overrides: Partial<PendingQuestionRecord> = {}): PendingQuestionRecord {
  return {
    id: "pq-1",
    sessionId: "session-1",
    toolType: "radar",
    createdByUid: "me",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "cancelled",
    randomizedTo: radarRoll,
    placement: {
      geometryJson: JSON.stringify({ type: "Point", coordinates: [-6.26, 53.35] }),
      metadata: { radiusMeters: radarOriginalOption.optionKey },
    },
    replyOptions: [],
    promptText: "Radar",
    cardDraw: 1,
    cardKeep: 1,
    ...overrides,
  };
}

function matchingOriginal(
  toolType: "matching" | "measuring" = "matching",
  randomizedTo = matchingRoll,
): PendingQuestionRecord {
  return radarOriginal({
    toolType,
    randomizedTo,
    placement: {
      geometryJson: JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [-6.26, 53.35] },
      }),
      metadata: {},
    },
  });
}

const matchingPayload = {
  promptText: "Matching",
  replyOptions: [],
  placement: { geometryJson: "{}", metadata: {} },
};

function setup(overrides: Partial<UseRandomizeAutoAskParams> = {}) {
  const submitToolQuestion = vi.fn<UseRandomizeAutoAskParams["submitToolQuestion"]>(
    async () => "pq-new",
  );
  const onManual = vi.fn<UseRandomizeAutoAskParams["onManual"]>();
  const props: UseRandomizeAutoAskParams = {
    sessionId: "session-1",
    uid: "me",
    enabled: true,
    pendingQuestions: [radarOriginal()],
    sessionRules: session,
    annotations: [],
    gameArea,
    distanceUnit: "metric",
    canSubmitQuestion: true,
    submitToolQuestion,
    onManual,
    ...overrides,
  };
  return { props, submitToolQuestion, onManual };
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("useRandomizeAutoAsk", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(resolveRandomizedMatching).mockClear();
    vi.mocked(resolveRandomizedMeasuring).mockClear();
  });

  it("submits the randomized radar exactly once across rerender and remount", async () => {
    const { props, submitToolQuestion } = setup();
    const first = renderHook((p: UseRandomizeAutoAskParams) => useRandomizeAutoAsk(p), {
      initialProps: props,
    });

    await waitFor(() => expect(submitToolQuestion).toHaveBeenCalledTimes(1));
    const [toolType, input] = submitToolQuestion.mock.calls[0];
    expect(toolType).toBe("radar");
    expect(input.placement.metadata.randomizedFrom).toBe("pq-1");
    expect(input.placement.metadata.radiusMeters).toBe(radarRoll.optionKey);

    first.rerender({ ...props, pendingQuestions: [...props.pendingQuestions] });
    first.unmount();
    renderHook(() => useRandomizeAutoAsk(props));
    await settle();

    expect(submitToolQuestion).toHaveBeenCalledTimes(1);
  });

  it("waits until the seeker can submit", async () => {
    const { props, submitToolQuestion } = setup({ canSubmitQuestion: false });
    const view = renderHook((p: UseRandomizeAutoAskParams) => useRandomizeAutoAsk(p), {
      initialProps: props,
    });
    await settle();
    expect(submitToolQuestion).not.toHaveBeenCalled();

    view.rerender({ ...props, canSubmitQuestion: true });
    await waitFor(() => expect(submitToolQuestion).toHaveBeenCalledTimes(1));
  });

  it("ignores a question created by another seeker", async () => {
    const { props, submitToolQuestion } = setup({
      pendingQuestions: [radarOriginal({ createdByUid: "other" })],
    });
    renderHook(() => useRandomizeAutoAsk(props));
    await settle();
    expect(submitToolQuestion).not.toHaveBeenCalled();
  });

  it("ignores a question that is not cancelled", async () => {
    const { props, submitToolQuestion } = setup({
      pendingQuestions: [radarOriginal({ status: "pending" })],
    });
    renderHook(() => useRandomizeAutoAsk(props));
    await settle();
    expect(submitToolQuestion).not.toHaveBeenCalled();
  });

  it("does nothing once the seeker has moved on to a newer question", async () => {
    const newer = radarOriginal({
      id: "pq-2",
      createdAt: "2026-01-01T00:05:00.000Z",
      status: "answered",
      randomizedTo: undefined,
    });
    const { props, submitToolQuestion } = setup({
      pendingQuestions: [radarOriginal(), newer],
    });
    renderHook(() => useRandomizeAutoAsk(props));
    await settle();
    expect(submitToolQuestion).not.toHaveBeenCalled();
  });

  it("hands a thermometer roll to onManual with the catalog label and preset key", async () => {
    const original = radarOriginal({
      toolType: "thermometer",
      randomizedTo: thermometerRoll,
      placement: { geometryJson: "{}", metadata: {} },
    });
    const { props, submitToolQuestion, onManual } = setup({ pendingQuestions: [original] });
    renderHook(() => useRandomizeAutoAsk(props));

    await waitFor(() =>
      expect(onManual).toHaveBeenCalledExactlyOnceWith(
        "thermometer",
        thermometerRoll.label,
        thermometerRoll.optionKey,
      ),
    );
    expect(submitToolQuestion).not.toHaveBeenCalled();
  });

  it("forwards the play area and distance unit to the matching resolver", async () => {
    vi.mocked(resolveRandomizedMatching).mockResolvedValueOnce(matchingPayload);
    const { props, submitToolQuestion } = setup({ pendingQuestions: [matchingOriginal()] });
    renderHook(() => useRandomizeAutoAsk(props));

    await waitFor(() => expect(submitToolQuestion).toHaveBeenCalledTimes(1));
    expect(resolveRandomizedMatching).toHaveBeenCalledWith(
      [53.35, -6.26],
      matchingRoll.optionKey,
      { cardDraw: 1, cardKeep: 1 },
      expect.objectContaining({ gameArea, distanceUnit: "metric" }),
    );
    expect(submitToolQuestion.mock.calls[0][0]).toBe("matching");
  });

  it("skips the send when the seeker asked manually while the resolver ran", async () => {
    let resolvePayload: (payload: typeof matchingPayload) => void = () => {};
    vi.mocked(resolveRandomizedMatching).mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePayload = resolve;
      }),
    );
    const { props, submitToolQuestion, onManual } = setup({
      pendingQuestions: [matchingOriginal()],
    });
    const view = renderHook((p: UseRandomizeAutoAskParams) => useRandomizeAutoAsk(p), {
      initialProps: props,
    });
    await waitFor(() => expect(resolveRandomizedMatching).toHaveBeenCalledTimes(1));

    view.rerender({ ...props, canSubmitQuestion: false });
    resolvePayload(matchingPayload);
    await settle();

    expect(submitToolQuestion).not.toHaveBeenCalled();
    expect(onManual).not.toHaveBeenCalled();
  });

  it("waits for the play area before resolving a matching roll", async () => {
    vi.mocked(resolveRandomizedMatching).mockResolvedValueOnce(matchingPayload);
    const { props, submitToolQuestion, onManual } = setup({
      pendingQuestions: [matchingOriginal()],
      gameArea: JOIN_PREVIEW_PLACEHOLDER_AREA,
    });
    const view = renderHook((p: UseRandomizeAutoAskParams) => useRandomizeAutoAsk(p), {
      initialProps: props,
    });
    await settle();
    expect(resolveRandomizedMatching).not.toHaveBeenCalled();
    expect(onManual).not.toHaveBeenCalled();

    view.rerender({ ...props, gameArea });
    await waitFor(() => expect(submitToolQuestion).toHaveBeenCalledTimes(1));
    await settle();
    expect(submitToolQuestion).toHaveBeenCalledTimes(1);
    expect(onManual).not.toHaveBeenCalled();
  });

  it("waits for the play area before resolving a measuring roll", async () => {
    vi.mocked(resolveRandomizedMeasuring).mockResolvedValueOnce(matchingPayload);
    const { props, submitToolQuestion, onManual } = setup({
      pendingQuestions: [matchingOriginal("measuring", measuringRoll)],
      gameArea: JOIN_PREVIEW_PLACEHOLDER_AREA,
    });
    const view = renderHook((p: UseRandomizeAutoAskParams) => useRandomizeAutoAsk(p), {
      initialProps: props,
    });
    await settle();
    expect(resolveRandomizedMeasuring).not.toHaveBeenCalled();
    expect(onManual).not.toHaveBeenCalled();

    view.rerender({ ...props, gameArea });
    await waitFor(() => expect(submitToolQuestion).toHaveBeenCalledTimes(1));
    expect(submitToolQuestion.mock.calls[0][0]).toBe("measuring");
    expect(onManual).not.toHaveBeenCalled();
  });

  it("tells the seeker when the submit is refused", async () => {
    const { props, submitToolQuestion, onManual } = setup();
    submitToolQuestion.mockResolvedValue(undefined);
    renderHook(() => useRandomizeAutoAsk(props));

    await waitFor(() => expect(onManual).toHaveBeenCalledExactlyOnceWith("radar", radarRoll.label));
  });

  it("does nothing when disabled", async () => {
    const { props, submitToolQuestion } = setup({ enabled: false });
    renderHook(() => useRandomizeAutoAsk(props));
    await settle();
    expect(submitToolQuestion).not.toHaveBeenCalled();
  });
});

describe("nextRandomizedQuestion", () => {
  it("returns null for an already handled original", () => {
    expect(nextRandomizedQuestion([radarOriginal()], "me", new Set(["pq-1"]))).toBeNull();
  });
});
