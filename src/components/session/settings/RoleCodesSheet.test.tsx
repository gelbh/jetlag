import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestRemoteSession } from "@/test/fixtures/sessions";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { RoleCodesSheet } from "./RoleCodesSheet";

const revealRolePasscode = vi.fn();
const regenerateRolePasscode = vi.fn();
const prefetchRolePasscode = vi.fn();
const copy = vi.fn();

vi.mock("../../../services/session/rolePasscodeLifecycle", () => ({
  revealRolePasscode: (...args: unknown[]) => revealRolePasscode(...args),
  regenerateRolePasscode: (...args: unknown[]) => regenerateRolePasscode(...args),
  prefetchRolePasscode: (...args: unknown[]) => prefetchRolePasscode(...args),
}));

vi.mock("../../../hooks/forms/useCopyFeedback", () => ({
  useCopyFeedback: () => ({
    status: "idle" as const,
    copy: (...args: unknown[]) => copy(...args),
  }),
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

    renderWithAppUi(
      <RoleCodesSheet open onClose={vi.fn()} session={gatedSession} myUid="host-1" isHost />,
    );

    expect(screen.getByRole("dialog", { name: "Role codes" })).toBeInTheDocument();
    expect(screen.getAllByText("••••").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Reveal Seeker code/i }));

    await waitFor(() => {
      expect(revealRolePasscode).toHaveBeenCalledWith("sess-1", "seeker");
    });

    expect(await screen.findByText("WXYZ")).toBeInTheDocument();
  });

  it("resets revealed codes when closed then reopened", async () => {
    revealRolePasscode.mockResolvedValue({ rolePasscode: "WXYZ" });

    const { rerender } = renderWithAppUi(
      <RoleCodesSheet open onClose={vi.fn()} session={gatedSession} myUid="host-1" isHost />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Reveal Seeker code/i }));
    expect(await screen.findByText("WXYZ")).toBeInTheDocument();

    rerender(
      <RoleCodesSheet
        open={false}
        onClose={vi.fn()}
        session={gatedSession}
        myUid="host-1"
        isHost
      />,
    );
    rerender(
      <RoleCodesSheet open onClose={vi.fn()} session={gatedSession} myUid="host-1" isHost />,
    );

    expect(screen.getAllByText("••••").length).toBeGreaterThan(0);
    expect(screen.queryByText("WXYZ")).not.toBeInTheDocument();
  });
});
