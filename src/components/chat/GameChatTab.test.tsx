import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../../domain/session/activity/sessionChat";
import { renderWithAppUi } from "../../test/renderWithAppUi";
import { GameChatTab } from "./GameChatTab";

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
    renderWithAppUi(
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
    renderWithAppUi(
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

  it("shows dismiss for seekers on expired pending questions", () => {
    const onDismiss = vi.fn();
    renderWithAppUi(
      <GameChatTab
        messages={[questionMessage]}
        pendingQuestions={[
          {
            ...pendingQuestion,
            deadlineExpiredAt: "2026-01-01T00:05:00.000Z",
          },
        ]}
        sessionRules={{ gameSize: "medium" }}
        sessionId="session-1"
        isHider={false}
        senderUid="seeker-1"
        onAnswerQuestion={vi.fn()}
        onDismissExpiredQuestion={onDismiss}
      />,
    );

    expect(screen.getByRole("button", { name: "Dismiss question" })).toBeInTheDocument();
  });

  it("hides dismiss from hiders", () => {
    renderWithAppUi(
      <GameChatTab
        messages={[questionMessage]}
        pendingQuestions={[
          {
            ...pendingQuestion,
            deadlineExpiredAt: "2026-01-01T00:05:00.000Z",
          },
        ]}
        sessionRules={{ gameSize: "medium" }}
        sessionId="session-1"
        isHider
        senderUid="hider-1"
        onAnswerQuestion={vi.fn()}
        onDismissExpiredQuestion={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Dismiss question" })).not.toBeInTheDocument();
  });

  it("hides waiting copy when the question was cancelled", () => {
    renderWithAppUi(
      <GameChatTab
        messages={[{ ...questionMessage, status: "cancelled" }]}
        pendingQuestions={[{ ...pendingQuestion, status: "cancelled" }]}
        sessionRules={{ gameSize: "medium" }}
        sessionId="session-1"
        isHider={false}
        senderUid="seeker-1"
        onAnswerQuestion={vi.fn()}
      />,
    );

    expect(screen.queryByText("Waiting for hider…")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dismiss question" })).not.toBeInTheDocument();
  });

  it("marks question rows waiting for server ack (and drops Waiting for hider)", async () => {
    renderWithAppUi(
      <GameChatTab
        messages={[{ ...questionMessage, pendingSync: true }]}
        pendingQuestions={[pendingQuestion]}
        sessionRules={{ gameSize: "medium" }}
        sessionId="session-1"
        isHider={false}
        senderUid="seeker-1"
        onAnswerQuestion={vi.fn()}
      />,
    );

    expect(screen.queryByText("Waiting to send")).not.toBeInTheDocument();
    expect(
      await screen.findByText("Waiting to send", {}, { timeout: 2000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Waiting for hider…")).not.toBeInTheDocument();
  });

  it("omits the pending badge once acked", () => {
    renderWithAppUi(
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

    expect(screen.queryByText("Waiting to send")).not.toBeInTheDocument();
  });
});
