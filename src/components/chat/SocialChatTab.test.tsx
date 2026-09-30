import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithAppUi } from "../../test/renderWithAppUi";
import type { SessionMessageRecord } from "../../domain/session/activity/sessionChat";
import { SocialChatTab } from "./SocialChatTab";

vi.mock("../../services/firestore/firestoreSessionExtras", () => ({
  postSocialMessage: vi.fn(),
}));

const message: SessionMessageRecord = {
  id: "m1",
  sessionId: "session-1",
  channel: "social",
  senderUid: "seeker-1",
  senderRole: "seeker",
  createdAt: "2026-01-01T00:00:00.000Z",
  text: "On the tram",
};

describe("SocialChatTab", () => {
  it("shows Waiting to send on messages not yet acked", async () => {
    renderWithAppUi(
      <SocialChatTab
        messages={[{ ...message, pendingSync: true }]}
        sessionId="session-1"
        senderUid="seeker-1"
        senderRole="seeker"
      />,
    );

    expect(screen.getByText("On the tram")).toBeInTheDocument();
    expect(screen.queryByText("Waiting to send")).not.toBeInTheDocument();
    expect(
      await screen.findByText("Waiting to send", {}, { timeout: 2000 }),
    ).toBeInTheDocument();
  });

  it("hides the badge for acked messages", () => {
    renderWithAppUi(
      <SocialChatTab
        messages={[message]}
        sessionId="session-1"
        senderUid="seeker-1"
        senderRole="seeker"
      />,
    );

    expect(screen.queryByText("Waiting to send")).not.toBeInTheDocument();
  });
});
