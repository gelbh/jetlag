import { Button } from "@mantine/core";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { type ModerationAction, useModerationConfirm } from "./useModerationConfirm";

function Harness({ run }: { run: (action: ModerationAction) => Promise<void> }) {
  const { request, confirm } = useModerationConfirm({ sessionCode: "ABCD", run });
  return (
    <>
      <Button onClick={() => request("end")}>Force end</Button>
      <Button onClick={() => request("resetBoard")}>Reset board</Button>
      <Button onClick={() => request("cleanupCode")}>Cleanup code</Button>
      {confirm}
    </>
  );
}

describe("useModerationConfirm", () => {
  it.each([
    ["Force end", "Start end game", "end"],
    ["Reset board", "Reset board for ABCD", "resetBoard"],
    ["Cleanup code", "End and retire ABCD", "cleanupCode"],
  ] as const)("%s runs only after confirm", async (open, confirmLabel, action) => {
    const run = vi.fn().mockResolvedValue(undefined);
    renderWithAppUi(<Harness run={run} />);
    fireEvent.click(screen.getByRole("button", { name: open }));
    expect(run).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: confirmLabel }));
    await waitFor(() => expect(run).toHaveBeenCalledWith(action));
  });

  it("Cancel runs nothing", async () => {
    const run = vi.fn();
    renderWithAppUi(<Harness run={run} />);
    fireEvent.click(screen.getByRole("button", { name: "Force end" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(run).not.toHaveBeenCalled();
  });

  it("shows the failure inside the modal", async () => {
    const run = vi.fn().mockRejectedValue(new Error("Moderation failed."));
    renderWithAppUi(<Harness run={run} />);
    fireEvent.click(screen.getByRole("button", { name: "Force end" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start end game" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Moderation failed.");
  });
});
