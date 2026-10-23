import { useEffect, useState } from "react";
import { EntryAsyncButton } from "@/components/ui/entry/EntryAsyncButton";
import type { GameArea } from "@/domain/map/annotations";
import {
  assignHalvesByCastleSide,
  isLegalFairSplitCut,
  type ProposeFairSplitOk,
  scoreFairSplitCandidate,
} from "@/domain/session/castleSiege/fairSplit";
import {
  buildFairSplitLockPatch,
  type FairSplitLockPatch,
  nudgeFairSplitBorder,
  resolveFairSplitSetupPath,
} from "@/domain/session/castleSiege/fairSplitLock";
import {
  buildNeutralBelt,
  type CastleSiegeBorderLine,
  type CastleSiegeSealPoint,
} from "@/domain/session/castleSiege/pregame";

export type FairSplitProposalProps = {
  arena: GameArea;
  sealA: CastleSiegeSealPoint;
  sealB: CastleSiegeSealPoint;
  beltWidthMeters: number;
  isHost: boolean;
  candidates?: readonly CastleSiegeBorderLine[];
  alreadyLocked?: boolean;
  onLock: (patch: FairSplitLockPatch) => Promise<void>;
};

type ProposalState =
  | { status: "idle" }
  | {
      status: "ready";
      proposal: ProposeFairSplitOk;
      draftBorder: CastleSiegeBorderLine;
      draftLegal: boolean;
    }
  | { status: "manualPath" }
  | { status: "locked" };

function evaluateNudgedDraft(args: {
  arena: GameArea;
  draftBorder: CastleSiegeBorderLine;
  sealA: CastleSiegeSealPoint;
  sealB: CastleSiegeSealPoint;
  beltWidthMeters: number;
}): ProposeFairSplitOk | null {
  const { arena, draftBorder, sealA, sealB, beltWidthMeters } = args;
  const legality = { arena, border: draftBorder, sealA, sealB, beltWidthMeters };
  if (!isLegalFairSplitCut(legality)) {
    return null;
  }
  const halves = assignHalvesByCastleSide(sealA, sealB, draftBorder);
  if (!halves) {
    return null;
  }
  try {
    const neutralBelt = buildNeutralBelt(draftBorder, beltWidthMeters);
    return {
      ok: true,
      border: draftBorder,
      halves,
      neutralBelt,
      score: scoreFairSplitCandidate(legality),
    };
  } catch {
    return null;
  }
}

export function FairSplitProposal({
  arena,
  sealA,
  sealB,
  beltWidthMeters,
  isHost,
  candidates,
  alreadyLocked = false,
  onLock,
}: FairSplitProposalProps) {
  const [state, setState] = useState<ProposalState>(() =>
    alreadyLocked ? { status: "locked" } : { status: "idle" },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nudgeNote, setNudgeNote] = useState<string | null>(null);

  useEffect(() => {
    if (alreadyLocked) {
      setState({ status: "locked" });
    }
  }, [alreadyLocked]);

  const runPropose = () => {
    setError(null);
    setNudgeNote(null);
    const path = resolveFairSplitSetupPath({
      arena,
      sealA,
      sealB,
      beltWidthMeters,
      ...(candidates !== undefined ? { candidates } : {}),
    });
    if (path.kind === "manualPath") {
      setState({ status: "manualPath" });
      return;
    }
    setState({
      status: "ready",
      proposal: path.result,
      draftBorder: path.result.border,
      draftLegal: true,
    });
  };

  const applyNudge = (label: string, nudge: { translateLng?: number; rotateDegrees?: number }) => {
    if (state.status !== "ready" || !isHost) return;
    setNudgeNote(label);
    setError(null);
    const draftBorder = nudgeFairSplitBorder(state.draftBorder, nudge);
    const evaluated = evaluateNudgedDraft({
      arena,
      draftBorder,
      sealA,
      sealB,
      beltWidthMeters,
    });
    if (!evaluated) {
      setState({
        status: "ready",
        proposal: state.proposal,
        draftBorder,
        draftLegal: false,
      });
      setError("Nudged border is illegal. Propose again or draw manually.");
      return;
    }
    setState({
      status: "ready",
      proposal: evaluated,
      draftBorder,
      draftLegal: true,
    });
  };

  const lockBorder = async () => {
    if (state.status !== "ready" || !isHost || busy || !state.draftLegal) return;
    setBusy(true);
    setError(null);
    try {
      const lock = buildFairSplitLockPatch({
        isHost,
        arena,
        border: state.draftBorder,
        sealA,
        sealB,
        beltWidthMeters,
      });
      if (!lock.ok) {
        setError(
          lock.reason === "illegalCut"
            ? "Nudged border is illegal. Propose again or draw manually."
            : "Only the host can lock the border.",
        );
      } else {
        await onLock(lock.patch);
        setState({ status: "locked" });
      }
    } catch {
      setError("Couldn't lock border. Try again.");
    }
    setBusy(false);
  };

  const statusLabel =
    state.status === "idle"
      ? "Awaiting proposal"
      : state.status === "manualPath"
        ? "No legal cut: draw border manually"
        : state.status === "locked"
          ? "Border locked"
          : state.draftLegal
            ? "Proposal ready"
            : "Nudged border illegal";

  const scoreLabel =
    state.status === "ready" && state.draftLegal
      ? `Score ${state.proposal.score.toFixed(3)}`
      : state.status === "ready"
        ? "Score unavailable (illegal nudge)"
        : null;

  return (
    <section
      aria-label="Fair-split proposal"
      data-testid="castle-siege-fair-split-proposal"
      className="rounded-md border px-3 py-2.5"
      style={{
        borderColor: "var(--color-rule)",
        background: "oklch(from var(--color-canvas) l c h / 92%)",
        color: "var(--color-field-ink)",
        boxShadow: "var(--shadow-hud-float)",
      }}
    >
      <p
        className="m-0 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--color-flag)" }}
      >
        Fair-split proposal
      </p>

      <p className="m-0 mt-2 text-sm" data-testid="castle-siege-fair-split-status">
        {statusLabel}
      </p>

      {scoreLabel ? (
        <p className="m-0 mt-1 text-xs" style={{ color: "var(--color-field-ink-muted)" }}>
          {scoreLabel}
          {nudgeNote ? ` · ${nudgeNote}` : ""}
        </p>
      ) : null}

      {state.status === "manualPath" ? (
        <p
          className="m-0 mt-2 text-xs"
          role="status"
          data-testid="castle-siege-fair-split-manual-path"
          style={{ color: "var(--color-halt)" }}
        >
          No legal cut found. Retry propose, or draw the border manually (Pregame path).
        </p>
      ) : null}

      {state.status !== "locked" ? (
        <div className="mt-2">
          <EntryAsyncButton
            type="button"
            busy={false}
            idleLabel={state.status === "manualPath" ? "Retry propose" : "Propose fair split"}
            busyLabel="Proposing…"
            fullWidth
            onClick={runPropose}
          />
        </div>
      ) : null}

      {isHost && state.status === "ready" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-field-ink)" }}
            onClick={() => applyNudge("Nudged west", { translateLng: -0.002 })}
          >
            Nudge west
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-field-ink)" }}
            onClick={() => applyNudge("Nudged east", { translateLng: 0.002 })}
          >
            Nudge east
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-field-ink)" }}
            onClick={() => applyNudge("Rotated 5°", { rotateDegrees: 5 })}
          >
            Rotate 5°
          </button>
        </div>
      ) : null}

      {isHost && state.status === "ready" && state.draftLegal ? (
        <div className="mt-2">
          <EntryAsyncButton
            type="button"
            busy={busy}
            idleLabel="Lock border"
            busyLabel="Locking…"
            fullWidth
            onClick={() => void lockBorder()}
          />
        </div>
      ) : null}

      {error ? (
        <p className="m-0 mt-2 text-xs" style={{ color: "var(--color-halt)" }} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
