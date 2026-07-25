import { describe, expect, it } from "vitest";
import { deserializeIncidentThreadMessageFromFirestore } from "./firestoreIncidentThreads";

describe("deserializeIncidentThreadMessageFromFirestore", () => {
  it("parses a support tool_result message", () => {
    const message = deserializeIncidentThreadMessageFromFirestore(
      "msg-1",
      "inc-1",
      "support",
      {
        sender: "system",
        kind: "tool_result",
        text: "Ran soft_reload.",
        visibility: "support",
        createdAt: "2026-07-25T12:00:00.000Z",
        toolCall: {
          id: "call-1",
          name: "soft_reload",
          args: {},
          status: "ok",
        },
      },
    );

    expect(message).toMatchObject({
      id: "msg-1",
      incidentId: "inc-1",
      threadId: "support",
      sender: "system",
      kind: "tool_result",
      visibility: "support",
      toolCall: { name: "soft_reload", status: "ok" },
    });
  });

  it("parses hotfix agent_meta and rejects unknown senders", () => {
    const meta = deserializeIncidentThreadMessageFromFirestore(
      "msg-2",
      "inc-1",
      "hotfix",
      {
        sender: "hotfix_agent",
        kind: "agent_meta",
        text: "Launched coding agent",
        visibility: "hotfix",
        createdAt: "2026-07-25T12:00:00.000Z",
      },
    );
    expect(meta?.sender).toBe("hotfix_agent");
    expect(meta?.kind).toBe("agent_meta");

    expect(
      deserializeIncidentThreadMessageFromFirestore("msg-3", "inc-1", "hotfix", {
        sender: "bot",
        kind: "agent_meta",
        text: "nope",
        createdAt: "2026-07-25T12:00:00.000Z",
      }),
    ).toBeNull();
  });
});
