import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../../domain/session/activity/sessionChat";
import { HiderPendingQuestionAnswer } from "./HiderPendingQuestionAnswer";

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

const thermoPending: PendingQuestionRecord = {
  id: "pq-thermo",
  sessionId: "s1",
  toolType: "thermometer",
  createdByUid: "seeker",
  createdAt: "2026-01-01T00:00:00.000Z",
  status: "walking",
  placement: { geometryJson: "{}", metadata: {} },
  replyOptions: [],
  promptText: "Warm or cold?",
};

const thermoMessage: SessionMessageRecord = {
  id: "msg-thermo",
  sessionId: "s1",
  channel: "game",
  kind: "question",
  senderUid: "seeker",
  senderRole: "seeker",
  createdAt: "2026-01-01T00:00:00.000Z",
  status: "pending",
  pendingQuestionId: "pq-thermo",
  toolType: "thermometer",
  promptText: thermoPending.promptText,
};

describe("HiderPendingQuestionAnswer", () => {
  it("renders answer picker options for an open radar question", () => {
    render(
      <HiderPendingQuestionAnswer
        message={radarMessage}
        pending={radarPending}
        sessionRules={{ gameSize: "medium" }}
        sessionId="s1"
        truth={null}
        truthsLoading={false}
        truthReferenceMode="hidingZoneCenter"
        nowMs={Date.now()}
        onAnswerQuestion={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Send answer: Yes/i }),
    ).toBeInTheDocument();
  });

  it("hides answer controls while walking", () => {
    render(
      <HiderPendingQuestionAnswer
        message={thermoMessage}
        pending={thermoPending}
        sessionRules={{ gameSize: "medium" }}
        sessionId="s1"
        truth={null}
        truthsLoading={false}
        truthReferenceMode="hidingZoneCenter"
        nowMs={Date.now()}
        onAnswerQuestion={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Send answer/i })).toBeNull();
    expect(screen.getByText(/Seeker is walking/i)).toBeInTheDocument();
  });
});
