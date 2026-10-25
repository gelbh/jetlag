import { beforeEach, expect, it, vi } from "vitest";

export type OracleCommitHarness = {
  name: string;
  run: (input: unknown) => Promise<unknown>;
  baseInput: (overrides: Record<string, unknown>) => unknown;
  oracleKind: "matching" | "photo" | "radar" | "tentacle" | "measuring";
  expectFirstPassAsk?: (callOracle: ReturnType<typeof vi.fn>) => void;
  expectConfirmAnnotation?: (createAnnotation: ReturnType<typeof vi.fn>) => void;
  expectConfirmSuccess?: (onSuccess: ReturnType<typeof vi.fn>) => void;
};

const oracleFixtures = {
  matching: {
    firstPass: { kind: "matching", answer: "no" },
    confirm: { kind: "matching", answer: "yes" },
  },
  photo: {
    firstPass: {
      kind: "photo",
      answer: "mirror",
      mirror: { required: true, categoryId: "tree" },
    },
    confirm: {
      kind: "photo",
      answer: "mirror",
      mirror: { required: true, categoryId: "tree" },
    },
  },
  radar: {
    firstPass: { kind: "radar", answer: "no" },
    confirm: { kind: "radar", answer: "yes" },
  },
  tentacle: {
    firstPass: { kind: "tentacle", answer: "poi-1" },
    confirm: { kind: "tentacle", answer: "poi-1" },
  },
  measuring: {
    firstPass: { kind: "measuring", answer: "closer" },
    confirm: { kind: "measuring", answer: "further" },
  },
} as const;

export function describeCastleSiegeOracleCommit(h: OracleCommitHarness): void {
  const callOracle = vi.fn();
  const onOracleReceipt = vi.fn();
  const submitPendingQuestion = vi.fn();
  const createAnnotation = vi.fn();
  const setMapError = vi.fn();
  const onSuccess = vi.fn();
  const fixture = oracleFixtures[h.oracleKind];

  beforeEach(() => {
    callOracle.mockReset();
    onOracleReceipt.mockReset();
    submitPendingQuestion.mockReset();
    createAnnotation.mockReset();
    setMapError.mockReset();
    onSuccess.mockReset();
    submitPendingQuestion.mockResolvedValue(undefined);
    createAnnotation.mockResolvedValue({ id: "ann-1" });
  });

  it("classic honor pending path does not call oracle", async () => {
    await h.run(
      h.baseInput({
        sessionMode: "classic",
        callOracleAsk: callOracle,
        onOracleReceipt,
        submitPendingQuestion,
        createAnnotation,
        setMapError,
        setMatchingError: setMapError,
        onSuccess,
      }),
    );

    expect(callOracle).not.toHaveBeenCalled();
    expect(onOracleReceipt).not.toHaveBeenCalled();
    expect(submitPendingQuestion).toHaveBeenCalledTimes(1);
    expect(createAnnotation).not.toHaveBeenCalled();
  });

  it("castleSiege first pass routes to oracle and stashes receipt", async () => {
    callOracle.mockResolvedValue(fixture.firstPass);

    await h.run(
      h.baseInput({
        sessionMode: "castleSiege",
        callOracleAsk: callOracle,
        onOracleReceipt,
        submitPendingQuestion,
        createAnnotation,
        setMapError,
        setMatchingError: setMapError,
        onSuccess,
      }),
    );

    expect(callOracle).toHaveBeenCalled();
    expect(callOracle.mock.calls[0]?.[0]?.ask?.kind).toBe(h.oracleKind);
    h.expectFirstPassAsk?.(callOracle);
    expect(onOracleReceipt).toHaveBeenCalledWith(fixture.firstPass);
    expect(submitPendingQuestion).not.toHaveBeenCalled();
    expect(createAnnotation).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("castleSiege confirm-send uses oracle receipt without honor typing", async () => {
    await h.run(
      h.baseInput({
        sessionMode: "castleSiege",
        oracleReceipt: fixture.confirm,
        callOracleAsk: callOracle,
        onOracleReceipt,
        submitPendingQuestion,
        createAnnotation,
        setMapError,
        setMatchingError: setMapError,
        onSuccess,
      }),
    );

    expect(callOracle).not.toHaveBeenCalled();
    expect(submitPendingQuestion).not.toHaveBeenCalled();
    h.expectConfirmAnnotation?.(createAnnotation);
    h.expectConfirmSuccess?.(onSuccess);
  });
}
