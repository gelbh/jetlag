import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RoleJoinRequest } from "../../../domain/session/players/joinRequest";
import { RoleJoinRequestAlert } from "./RoleJoinRequestAlert";

function pendingRequest(
  overrides: Partial<RoleJoinRequest> = {},
): RoleJoinRequest {
  return {
    id: "req-1",
    sessionId: "sess-1",
    requesterUid: "uid-1",
    role: "seeker",
    status: "pending",
    identityLabel: "ada",
    createdAt: "2026-08-03T12:00:00.000Z",
    expiresAt: "2026-08-03T12:10:00.000Z",
    ...overrides,
  };
}

describe("RoleJoinRequestAlert", () => {
  it("renders identity and role with Accept/Decline", () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();

    render(
      <RoleJoinRequestAlert
        request={pendingRequest()}
        onAccept={onAccept}
        onDecline={onDecline}
      />,
    );

    expect(
      screen.getByText("ada wants to join as Seeker"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(onAccept).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("is hidden when there is no pending request", () => {
    const { container } = render(
      <RoleJoinRequestAlert
        request={null}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("disables actions while busy", () => {
    render(
      <RoleJoinRequestAlert
        request={pendingRequest({ role: "hider", identityLabel: "bob" })}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        busy
      />,
    );

    expect(screen.getByText("bob wants to join as Hider")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decline" })).toBeDisabled();
  });
});
