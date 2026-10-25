import { describe, expect, it } from "vitest";
import {
  advanceAfterAnswer,
  armLastWord,
  createInitialStandoffTurn,
  DEFAULT_STANDOFF_CLOCKS,
  STANDOFF_MAX_ROUNDS,
  startAnswerWindow,
  whoseTurn,
} from "./standoffTurn";

describe("standoffTurn clocks", () => {
  it("defaults match design: 15m turn, 5m answer, 10m photo, max 10 rounds", () => {
    expect(DEFAULT_STANDOFF_CLOCKS.turnSeconds).toBe(15 * 60);
    expect(DEFAULT_STANDOFF_CLOCKS.answerSeconds).toBe(5 * 60);
    expect(DEFAULT_STANDOFF_CLOCKS.photoAnswerSeconds).toBe(10 * 60);
    expect(STANDOFF_MAX_ROUNDS).toBe(10);
  });

  it("starts with teamA turn round 1", () => {
    const turn = createInitialStandoffTurn(1_000);
    expect(whoseTurn(turn)).toBe("teamA");
    expect(turn.round).toBe(1);
    expect(turn.phase).toBe("turn");
    expect(turn.deadlineMs).toBe(1_000 + DEFAULT_STANDOFF_CLOCKS.turnSeconds * 1000);
  });

  it("honors seriesStandoffOpener as activeTeam", () => {
    const turn = createInitialStandoffTurn(0, DEFAULT_STANDOFF_CLOCKS, "teamB");
    expect(whoseTurn(turn)).toBe("teamB");
    expect(turn.activeTeam).toBe("teamB");
  });

  it("Double Time doubles the answer window", () => {
    const turn = createInitialStandoffTurn(0);
    const answering = startAnswerWindow(turn, { nowMs: 100, photo: false, doubleTime: true });
    expect(answering.phase).toBe("answer");
    expect(answering.deadlineMs).toBe(100 + DEFAULT_STANDOFF_CLOCKS.answerSeconds * 2 * 1000);
  });

  it("Photo uses 10 minute answer window", () => {
    const turn = createInitialStandoffTurn(0);
    const answering = startAnswerWindow(turn, { nowMs: 50, photo: true, doubleTime: false });
    expect(answering.deadlineMs).toBe(50 + DEFAULT_STANDOFF_CLOCKS.photoAnswerSeconds * 1000);
  });

  it("advancing after answer flips team and increments round after both acted", () => {
    let turn = createInitialStandoffTurn(0);
    turn = advanceAfterAnswer(turn, 200);
    expect(whoseTurn(turn)).toBe("teamB");
    expect(turn.round).toBe(1);
    turn = advanceAfterAnswer(turn, 300);
    expect(whoseTurn(turn)).toBe("teamA");
    expect(turn.round).toBe(2);
  });

  it("caps at max rounds then marks duskReady", () => {
    let turn = createInitialStandoffTurn(0);
    for (let i = 0; i < STANDOFF_MAX_ROUNDS * 2; i += 1) {
      turn = advanceAfterAnswer(turn, i * 10);
    }
    expect(turn.round).toBe(STANDOFF_MAX_ROUNDS);
    expect(turn.duskReady).toBe(true);
  });

  it("Last Word grants the non-breaching team one extra turn (V8)", () => {
    let turn = createInitialStandoffTurn(0);
    // teamA breaches → teamB gets Last Word
    turn = armLastWord(turn, "teamA");
    expect(turn.lastWordArmedFor).toBe("teamB");
    expect(turn.lastWordPending).toBe(true);
    turn = advanceAfterAnswer(turn, 10);
    expect(whoseTurn(turn)).toBe("teamB");
    turn = advanceAfterAnswer(turn, 20);
    expect(turn.lastWordPending).toBe(false);
    expect(turn.phase).toBe("postLastWord");
  });
});
