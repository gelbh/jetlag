import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { IncidentThreadMessageRecord } from "../../services/firestore/firestoreIncidentThreads";
import { renderWithRouter } from "../../test/renderWithRouter";
import { AdminHotfixThread } from "./AdminHotfixThread";

vi.mock("../../hooks/incident/useHotfixThread", () => ({
  useHotfixThread: () => ({
    messages: [],
    error: null,
  }),
}));

describe("AdminHotfixThread", () => {
  it("renders empty state for private hotfix thread", () => {
    renderWithRouter(
      <AdminHotfixThread incidentId="inc-1" messagesOverride={[]} />,
    );

    expect(screen.getByTestId("admin-hotfix-thread")).toBeInTheDocument();
    expect(screen.getByText(/Private hotfix thread/i)).toBeInTheDocument();
    expect(
      screen.getByText(/players cannot read this thread/i),
    ).toBeInTheDocument();
  });

  it("renders coding-agent agent_meta rows", () => {
    const messages: IncidentThreadMessageRecord[] = [
      {
        id: "hm1",
        incidentId: "inc-1",
        threadId: "hotfix",
        sender: "hotfix_agent",
        createdAt: "2026-07-25T12:02:00Z",
        text: "Agent launched · https://cursor.com/agents/abc",
        kind: "agent_meta",
        visibility: "hotfix",
      },
    ];

    renderWithRouter(
      <AdminHotfixThread
        incidentId="inc-1"
        messagesOverride={messages}
      />,
    );

    expect(screen.getByText(/Coding agent/i)).toBeInTheDocument();
    expect(screen.getByText(/Agent launched/i)).toBeInTheDocument();
    expect(screen.getByText(/meta/i)).toBeInTheDocument();
  });
});
