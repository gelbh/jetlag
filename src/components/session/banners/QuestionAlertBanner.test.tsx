import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "@/domain/session/activity/sessionChat";
import { QuestionAlertBanner } from "./QuestionAlertBanner";

const radarPending: PendingQuestionRecord = {
  id: "pq-radar",
  sessionId: "s1",
  toolType: "radar",
  createdByUid: "seeker",
  createdAt: "2026-01-01T00:00:00.000Z",
  status: "pending",
  placement: { geometryJson: "{}", metadata: {} },
  replyOptions: [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ],
  promptText: "Are you within range?",
  answerableAt: "2026-01-01T00:00:00.000Z",
};

const radarMessage: SessionMessageRecord = {
  id: "msg-radar",
  sessionId: "s1",
  channel: "game",
  kind: "question",
  senderUid: "seeker",
  senderRole: "seeker",
  createdAt: "2026-01-01T00:00:00.000Z",
  status: "pending",
  pendingQuestionId: "pq-radar",
  toolType: "radar",
  promptText: radarPending.promptText,
  replyOptions: radarPending.replyOptions,
};

const walkingPending: PendingQuestionRecord = {
  ...radarPending,
  id: "pq-walk",
  toolType: "thermometer",
  status: "walking",
  answerableAt: undefined,
  replyOptions: [],
  promptText: "Warm or cold?",
};

const walkingMessage: SessionMessageRecord = {
  ...radarMessage,
  id: "msg-walk",
  pendingQuestionId: "pq-walk",
  toolType: "thermometer",
  promptText: walkingPending.promptText,
  replyOptions: undefined,
};

describe("QuestionAlertBanner", () => {
  it("shows prompt and answer controls for primary pending question", () => {
    render(
      <QuestionAlertBanner
        pendingQuestions={[radarPending]}
        messages={[radarMessage]}
        sessionRules={{ gameSize: "medium" }}
        sessionId="s1"
        onAnswerQuestion={vi.fn()}
      />,
    );

    expect(screen.getByText(radarPending.promptText)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Send answer: Yes/i }),
    ).toBeInTheDocument();
  });

  it("does not render a dismiss control while open", () => {
    render(
      <QuestionAlertBanner
        pendingQuestions={[radarPending]}
        messages={[radarMessage]}
        sessionRules={{ gameSize: "medium" }}
        sessionId="s1"
        onAnswerQuestion={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /dismiss/i })).toBeNull();
  });

  it("shows walking status without answer buttons", () => {
    render(
      <QuestionAlertBanner
        pendingQuestions={[walkingPending]}
        messages={[walkingMessage]}
        sessionRules={{ gameSize: "medium" }}
        sessionId="s1"
        onAnswerQuestion={vi.fn()}
      />,
    );

    expect(screen.getByText(/Seeker is walking/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Send answer/i })).toBeNull();
  });
});
