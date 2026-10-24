import type { SessionMode } from "@/domain/session/castleSiege/mode";
import type { CastleSiegeOracleReceipt } from "@/domain/session/castleSiege/oracleAskReceipt";
import type { CastleSiegePlayingTeam } from "@/domain/session/castleSiege/pregame";
import { resolveAskPath } from "@/domain/session/castleSiege/resolveAskPath";
import { callWithResilience } from "@/services/core/firebase/callWithResilience";
import { isFirebaseConfigured } from "@/services/core/firebase/firebase";

export type CastleSiegeOracleAskPayload =
  | { kind: "radar"; point: { lat: number; lng: number }; radiusMeters: number }
  | {
      kind: "matching";
      seekerFeatureId: string;
      features: { id: string; lat: number; lng: number }[];
    }
  | {
      kind: "measuring";
      seekerPoint: { lat: number; lng: number };
      targetPoint: { lat: number; lng: number };
    }
  | {
      kind: "tentacle";
      center: { lat: number; lng: number };
      radiusMeters: number;
      pois: { id: string; lat: number; lng: number }[];
    }
  | { kind: "photo"; categoryId: string }
  | { kind: "compass"; point: { lat: number; lng: number } };

export type AnswerCastleSiegeOracleAskInput = {
  sessionId: string;
  defenderTeamId: CastleSiegePlayingTeam;
  ask: CastleSiegeOracleAskPayload;
};

export type AnswerCastleSiegeOracleAskResult = {
  ok: true;
  receipt: CastleSiegeOracleReceipt;
};

export type AnswerCastleSiegeOracleAskFn = (
  input: AnswerCastleSiegeOracleAskInput,
) => Promise<CastleSiegeOracleReceipt>;

export async function answerCastleSiegeOracleAsk(
  input: AnswerCastleSiegeOracleAskInput,
): Promise<CastleSiegeOracleReceipt> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const data = await callWithResilience<
    AnswerCastleSiegeOracleAskInput,
    AnswerCastleSiegeOracleAskResult
  >("answerCastleSiegeOracleAsk", input, { idempotent: true });

  if (!data?.ok || !data.receipt || typeof data.receipt.kind !== "string") {
    throw new Error("Unexpected answerCastleSiegeOracleAsk response.");
  }
  return data.receipt;
}

export type ResolveAskAnswerResult<THonor> =
  | { path: "honor"; value: THonor }
  | { path: "oracle"; receipt: CastleSiegeOracleReceipt };

export async function resolveAskAnswer<THonor>(input: {
  mode: SessionMode | null | undefined;
  honor: () => Promise<THonor> | THonor;
  oracle?: {
    sessionId: string;
    defenderTeamId: CastleSiegePlayingTeam;
    ask: CastleSiegeOracleAskPayload;
    callOracle?: AnswerCastleSiegeOracleAskFn;
  };
}): Promise<ResolveAskAnswerResult<THonor>> {
  if (resolveAskPath(input.mode) === "honor") {
    return { path: "honor", value: await input.honor() };
  }

  if (!input.oracle) {
    throw new Error("Castle Siege ask requires oracle session and defender team.");
  }

  const callOracle = input.oracle.callOracle ?? answerCastleSiegeOracleAsk;
  const receipt = await callOracle({
    sessionId: input.oracle.sessionId,
    defenderTeamId: input.oracle.defenderTeamId,
    ask: input.oracle.ask,
  });
  return { path: "oracle", receipt };
}
