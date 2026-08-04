import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapScreenRoleCodesSheet } from "./MapScreenSharedSessionSheets";

vi.mock("../../../components/session/settings/RoleCodesSheet", () => ({
  RoleCodesSheet: ({ open }: { open: boolean }) =>
    open ? <div>role-codes-sheet</div> : null,
}));

const session = {
  id: "s1",
  code: "ABCD",
  roleGates: { version: 1, leaders: { seeker: "u1" } },
  memberRoles: { u1: "seeker" },
} as never;

describe("MapScreenRoleCodesSheet", () => {
  it("renders nothing when codes are unavailable", () => {
    const { container } = render(
      <MapScreenRoleCodesSheet
        session={session}
        uid="u1"
        isHost={false}
        isCodesOpen
        onCloseSheet={vi.fn()}
        canOpenCodes={false}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders RoleCodesSheet when gated open is allowed", () => {
    render(
      <MapScreenRoleCodesSheet
        session={session}
        uid="u1"
        isHost
        isCodesOpen
        onCloseSheet={vi.fn()}
        canOpenCodes
      />,
    );
    expect(screen.getByText("role-codes-sheet")).toBeInTheDocument();
  });
});
