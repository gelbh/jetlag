import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "@/domain/session/activity/sessionChat";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
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
    renderWithAppUi(
      <QuestionAlertBanner
        pendingQuestions={[radarPending]}
        messages={[radarMessage]}
        sessionRules={{ gameSize: "medium" }}
        sessionId="s1"
        onAnswerQuestion={vi.fn()}
      />,
    );

    expect(screen.getByText(radarPending.promptText)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send answer: Yes/i })).toBeInTheDocument();
    expect(screen.getByTestId("question-alert-banner").className).not.toMatch(/map-float-alert/);
    expect(screen.getByTestId("question-alert-banner").className).not.toMatch(/border-highlight/);
  });

  it("does not render a dismiss control while open", () => {
    renderWithAppUi(
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

  it("anchors below the status rail with map-banner-top", () => {
    const { container } = renderWithAppUi(
      <QuestionAlertBanner
        pendingQuestions={[radarPending]}
        messages={[radarMessage]}
        sessionRules={{ gameSize: "medium" }}
        sessionId="s1"
        onAnswerQuestion={vi.fn()}
      />,
    );

    expect(container.innerHTML).toContain("--map-banner-top");
  });

  it("hides when the question was answered optimistically", () => {
    renderWithAppUi(
      <QuestionAlertBanner
        pendingQuestions={[radarPending]}
        messages={[radarMessage]}
        sessionRules={{ gameSize: "medium" }}
        sessionId="s1"
        answeredPendingIds={new Set([radarPending.id])}
        onAnswerQuestion={vi.fn()}
      />,
    );

    expect(screen.queryByText(radarPending.promptText)).toBeNull();
    expect(screen.queryByRole("button", { name: /Send answer/i })).toBeNull();
  });

  it("shows walking status without answer buttons", () => {
    renderWithAppUi(
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
