import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestRemoteSession } from "@/test/fixtures/sessions";
import { RolePasscodeSettings } from "./RolePasscodeSettings";

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

const gatedSession = createTestRemoteSession({
  id: "sess-1",
  memberUids: ["host-1"],
  memberRoles: { "host-1": "seeker" },
  roleGates: {
    version: 1,
    leaders: { seeker: "host-1" },
  },
});

describe("RolePasscodeSettings", () => {
  beforeEach(() => {
    revealRolePasscode.mockReset();
    regenerateRolePasscode.mockReset();
    copy.mockReset();
    copy.mockResolvedValue(undefined);
  });

  it("reveals into stamp then copies on stamp tap", async () => {
    revealRolePasscode.mockResolvedValue({ rolePasscode: "WXYZ" });

    render(
      <RolePasscodeSettings
        session={gatedSession}
        myUid="host-1"
        isHost
      />,
    );

    expect(screen.getAllByText("••••").length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: /Reveal Seeker code/i }),
    );

    await waitFor(() => {
      expect(revealRolePasscode).toHaveBeenCalledWith("sess-1", "seeker");
    });

    expect(await screen.findByText("WXYZ")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Copy Seeker code/i }));

    await waitFor(() => {
      expect(copy).toHaveBeenCalledWith("WXYZ");
    });
  });
});
