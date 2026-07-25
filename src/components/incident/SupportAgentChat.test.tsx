import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { IncidentRecord } from "../../domain/incident/incidentTypes";
import type { IncidentThreadMessageRecord } from "../../services/firestore/firestoreIncidentThreads";
import { renderWithRouter } from "../../test/renderWithRouter";
import { SupportAgentChat } from "./SupportAgentChat";

vi.mock("../../hooks/incident/useSupportThread", () => ({
  useSupportThread: () => ({
    incident: null,
    messages: [],
    error: null,
    sending: false,
    summonId: null,
    sendTurn: vi.fn(),
  }),
}));

vi.mock("../../hooks/incident/usePendingHostConfirm", () => ({
  usePendingHostConfirm: () => ({
    pending: null,
    confirms: [],
    error: null,
  }),
}));

const baseIncident: IncidentRecord = {
  id: "inc-1",
  status: "open",
  createdAt: "2026-07-25T12:00:00Z",
  updatedAt: "2026-07-25T12:00:00Z",
  sessionId: "sess-1",
  sessionCode: "ABCD",
  reporterUid: "uid-1",
  reporterRole: "seeker",
  playerNote: null,
  diagnostics: {
    appVersion: "0.9.5",
    route: "/map",
    sessionId: "sess-1",
    sessionCode: "ABCD",
    playerRole: "seeker",
    uid: "uid-1",
    userAgent: "test",
    platform: "web",
    online: true,
    visibilityState: "visible",
    lastClientErrors: [],
    recentOps: [],
    reportedAt: "2026-07-25T12:00:00Z",
  },
  adminPrompt: "",
  sessionOpsSummonCount: 0,
};

describe("SupportAgentChat", () => {
  it("shows summon CTA and free-tier cap hint before an active summon", () => {
    renderWithRouter(
      <SupportAgentChat
        incidentId="inc-1"
        incidentOverride={baseIncident}
        messagesOverride={[]}
      />,
    );

    expect(screen.getByTestId("support-agent-caps")).toHaveTextContent(/Free/);
    expect(screen.getByTestId("support-agent-caps")).toHaveTextContent(
      /1 summon left/,
    );
    expect(
      screen.getByRole("button", { name: "Ask fix agent" }),
    ).toBeInTheDocument();
  });

  it("renders tool rows and waiting-on-host banner", () => {
    const messages: IncidentThreadMessageRecord[] = [
      {
        id: "m1",
        incidentId: "inc-1",
        threadId: "support",
        sender: "ops_agent",
        createdAt: "2026-07-25T12:01:00Z",
        text: "I can reset the board — need host OK.",
        kind: "question",
        visibility: "support",
      },
      {
        id: "m2",
        incidentId: "inc-1",
        threadId: "support",
        sender: "system",
        createdAt: "2026-07-25T12:01:05Z",
        text: "Waiting for host confirmation",
        kind: "host_confirm",
        visibility: "support",
        toolCall: {
          name: "reset_board",
          status: "host_confirm_required",
          confirmId: "c1",
        },
      },
    ];

    renderWithRouter(
      <SupportAgentChat
        incidentId="inc-1"
        incidentOverride={{
          ...baseIncident,
          activeSessionOpsSummonId: "sum-1",
          sessionOpsSummonCount: 1,
        }}
        messagesOverride={messages}
        summonIdOverride="sum-1"
        isHostOverride={false}
      />,
    );

    expect(screen.getByText(/Waiting on the session host/i)).toBeInTheDocument();
    expect(screen.getByText(/reset board/i)).toBeInTheDocument();
    expect(
      screen.getByText("I can reset the board — need host OK."),
    ).toBeInTheDocument();
  });

  it("sends a turn from the composer when a summon is active", async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);

    renderWithRouter(
      <SupportAgentChat
        incidentId="inc-1"
        incidentOverride={{
          ...baseIncident,
          activeSessionOpsSummonId: "sum-1",
          sessionOpsSummonCount: 1,
        }}
        messagesOverride={[
          {
            id: "m1",
            incidentId: "inc-1",
            threadId: "support",
            sender: "ops_agent",
            createdAt: "2026-07-25T12:01:00Z",
            text: "What broke?",
            kind: "question",
            visibility: "support",
          },
        ]}
        summonIdOverride="sum-1"
        onSendOverride={onSend}
      />,
    );

    fireEvent.change(screen.getByLabelText("Fix agent message"), {
      target: { value: "Map froze after radar" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).toHaveBeenCalledWith("Map froze after radar");
  });
});
