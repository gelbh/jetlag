import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameChatTab } from "./GameChatTab";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../../domain/sessionChat";

const pendingQuestion: PendingQuestionRecord = {
  id: "pq-radar",
  sessionId: "session-1",
  toolType: "radar",
  createdByUid: "seeker-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  status: "pending",
  placement: {
    geometryJson: "{}",
    metadata: { radiusMeters: 1609.344, radarChooseCustom: false },
  },
  replyOptions: [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ],
  promptText: "Are you within 1 mile of me?",
  answerableAt: "2026-01-01T00:00:00.000Z",
  cardDraw: 2,
  cardKeep: 1,
};

const questionMessage: SessionMessageRecord = {
  id: "msg-1",
  sessionId: "session-1",
  channel: "game",
  senderUid: "seeker-1",
  senderRole: "seeker",
  createdAt: "2026-01-01T00:00:00.000Z",
  kind: "question",
  pendingQuestionId: "pq-radar",
  toolType: "radar",
  promptText: pendingQuestion.promptText,
  replyOptions: pendingQuestion.replyOptions,
  status: "pending",
};

describe("GameChatTab", () => {
  it("shows draw and pick summary to hiders only", () => {
    render(
      <GameChatTab
        messages={[questionMessage]}
        pendingQuestions={[pendingQuestion]}
        sessionRules={{ gameSize: "medium" }}
        sessionId="session-1"
        isHider
        senderUid="hider-1"
        onAnswerQuestion={vi.fn()}
      />,
    );

    expect(screen.getByText("Draw 2, pick 1")).toBeInTheDocument();
  });

  it("hides draw and pick summary from seekers", () => {
    render(
      <GameChatTab
        messages={[questionMessage]}
        pendingQuestions={[pendingQuestion]}
        sessionRules={{ gameSize: "medium" }}
        sessionId="session-1"
        isHider={false}
        senderUid="seeker-1"
        onAnswerQuestion={vi.fn()}
      />,
    );

    expect(screen.queryByText("Draw 2, pick 1")).not.toBeInTheDocument();
    expect(screen.getByText(pendingQuestion.promptText!)).toBeInTheDocument();
  });
});
