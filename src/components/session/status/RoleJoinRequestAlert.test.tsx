import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RoleJoinRequest } from "@/domain/session/players/joinRequest";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { RoleJoinRequestAlert } from "./RoleJoinRequestAlert";

function pendingRequest(overrides: Partial<RoleJoinRequest> = {}): RoleJoinRequest {
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

    const { container } = renderWithAppUi(
      <RoleJoinRequestAlert request={pendingRequest()} onAccept={onAccept} onDecline={onDecline} />,
    );

    expect(screen.getByText("ada wants to join as Seeker")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(onAccept).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(container.innerHTML).not.toMatch(/map-float-alert|btn-primary|btn-secondary/);
    const panel = screen.getByTestId("role-join-request-alert");
    expect(panel.getAttribute("data-map-float-surface")).toBe("true");
    expect(panel.className).not.toMatch(/mantine-Alert-root/);
  });

  it("is hidden when there is no pending request", () => {
    renderWithAppUi(<RoleJoinRequestAlert request={null} onAccept={vi.fn()} onDecline={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
  });

  it("disables actions while busy", () => {
    renderWithAppUi(
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

  it("shows resolve error for the leader", () => {
    renderWithAppUi(
      <RoleJoinRequestAlert
        request={pendingRequest()}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        error="That player needs to update the app before they can join."
      />,
    );

    expect(
      screen.getByText("That player needs to update the app before they can join."),
    ).toBeInTheDocument();
  });
});
