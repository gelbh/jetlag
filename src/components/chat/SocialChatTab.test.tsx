import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionMessageRecord } from "../../domain/session/activity/sessionChat";
import { postSocialMessage } from "../../services/firestore/firestoreSessionExtras";
import { renderWithAppUi } from "../../test/renderWithAppUi";
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

const postSocialMessageMock = vi.mocked(postSocialMessage);

function renderComposer() {
  renderWithAppUi(
    <SocialChatTab messages={[]} sessionId="session-1" senderUid="seeker-1" senderRole="seeker" />,
  );
  return {
    input: screen.getByRole("textbox", { name: "Message" }) as HTMLInputElement,
    sendButton: screen.getByRole("button", { name: "Send" }),
  };
}

function submit(input: HTMLInputElement, sendButton: HTMLElement, text: string) {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(sendButton);
}

describe("SocialChatTab", () => {
  beforeEach(() => {
    postSocialMessageMock.mockReset();
    // Offline: the server ack never arrives.
    postSocialMessageMock.mockReturnValue(new Promise<void>(() => {}));
  });

  it("clears the draft and keeps send usable while the write is unacked", () => {
    const { input, sendButton } = renderComposer();

    submit(input, sendButton, "hi");

    expect(input.value).toBe("");
    expect(postSocialMessageMock).toHaveBeenCalledTimes(1);
    expect(postSocialMessageMock).toHaveBeenCalledWith(
      "session-1",
      "seeker-1",
      "seeker",
      "hi",
      expect.any(String),
    );

    fireEvent.change(input, { target: { value: "hi" } });
    expect(sendButton).toBeEnabled();
  });

  it("mints one id per submit so two sends are two distinct messages", () => {
    const { input, sendButton } = renderComposer();

    submit(input, sendButton, "hi");
    expect(postSocialMessageMock).toHaveBeenCalledTimes(1);

    submit(input, sendButton, "hi");
    expect(postSocialMessageMock).toHaveBeenCalledTimes(2);

    const firstId = postSocialMessageMock.mock.calls[0]?.[4];
    const secondId = postSocialMessageMock.mock.calls[1]?.[4];
    expect(firstId).toEqual(expect.any(String));
    expect(secondId).toEqual(expect.any(String));
    expect(firstId).not.toBe(secondId);
  });

  it("ignores whitespace-only drafts", () => {
    const { input } = renderComposer();

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    expect(postSocialMessageMock).not.toHaveBeenCalled();
  });

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
    expect(await screen.findByText("Waiting to send", {}, { timeout: 2000 })).toBeInTheDocument();
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
