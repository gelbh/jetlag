import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestRemoteSession } from "@/test/fixtures/sessions";
import { RoleCodesSheet } from "./RoleCodesSheet";

const revealRolePasscode = vi.fn();
const regenerateRolePasscode = vi.fn();
const copy = vi.fn();

vi.mock("../../../services/session/rolePasscodeLifecycle", () => ({
  revealRolePasscode: (...args: unknown[]) => revealRolePasscode(...args),
  regenerateRolePasscode: (...args: unknown[]) =>
    regenerateRolePasscode(...args),
}));

vi.mock("../../../hooks/forms/useCopyFeedback", () => ({
  useCopyFeedback: () => ({
    status: "idle" as const,
    copy: (...args: unknown[]) => copy(...args),
  }),
}));

vi.mock("../../../hooks/layout/useDesktopLayout", () => ({
  useDesktopLayout: () => false,
}));

const gatedSession = createTestRemoteSession({
  id: "sess-1",
  memberUids: ["host-1"],
  memberRoles: { "host-1": "seeker" },
  roleGates: {
    version: 1,
    leaders: { seeker: "host-1" },
  },
});

describe("RoleCodesSheet", () => {
  beforeEach(() => {
    revealRolePasscode.mockReset();
    regenerateRolePasscode.mockReset();
    copy.mockReset();
    copy.mockResolvedValue(undefined);
  });

  it("renders stamp rows and reveals on tap", async () => {
    revealRolePasscode.mockResolvedValue({ rolePasscode: "WXYZ" });

    render(
      <RoleCodesSheet
        open
        onClose={vi.fn()}
        session={gatedSession}
        myUid="host-1"
        isHost
      />,
    );

    expect(screen.getByRole("dialog", { name: "Role codes" })).toBeInTheDocument();
    expect(screen.getAllByText("••••").length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: /Reveal Seeker code/i }),
    );

    await waitFor(() => {
      expect(revealRolePasscode).toHaveBeenCalledWith("sess-1", "seeker");
    });

    expect(await screen.findByText("WXYZ")).toBeInTheDocument();
  });
});
