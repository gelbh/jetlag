import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapScreenRoleCodesSheet } from "./MapScreenSharedSessionSheets";

const mountCount = { current: 0 };

vi.mock("../../../components/session/settings/RoleCodesSheet", () => ({
  RoleCodesSheet: ({ open }: { open: boolean }) => {
    useEffect(() => {
      mountCount.current += 1;
    }, []);
    return <div data-testid="role-codes-sheet" data-open={String(open)} />;
  },
}));

const session = {
  id: "s1",
  code: "ABCD",
  roleGates: { version: 1, leaders: { seeker: "u1" } },
  memberRoles: { u1: "seeker" },
} as never;

describe("MapScreenRoleCodesSheet", () => {
  beforeEach(() => {
    mountCount.current = 0;
  });

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
    expect(screen.getByTestId("role-codes-sheet")).toHaveAttribute("data-open", "true");
  });

  it("does not remount RoleCodesSheet via open/closed key", () => {
    const { rerender } = render(
      <MapScreenRoleCodesSheet
        session={session}
        uid="u1"
        isHost
        isCodesOpen={false}
        onCloseSheet={vi.fn()}
        canOpenCodes
      />,
    );
    expect(mountCount.current).toBe(1);
    expect(screen.getByTestId("role-codes-sheet")).toHaveAttribute("data-open", "false");

    rerender(
      <MapScreenRoleCodesSheet
        session={session}
        uid="u1"
        isHost
        isCodesOpen
        onCloseSheet={vi.fn()}
        canOpenCodes
      />,
    );
    expect(mountCount.current).toBe(1);
    expect(screen.getByTestId("role-codes-sheet")).toHaveAttribute("data-open", "true");

    rerender(
      <MapScreenRoleCodesSheet
        session={session}
        uid="u1"
        isHost
        isCodesOpen={false}
        onCloseSheet={vi.fn()}
        canOpenCodes
      />,
    );
    expect(mountCount.current).toBe(1);
  });
});
