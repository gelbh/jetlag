import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { AskCommitStrip } from "./AskCommitStrip";
import { expectBusyPrimary, expectUnavailablePrimary } from "./primaryActionContract.testAssert";

describe("AskCommitStrip", () => {
  it("stays muted and does not fire commit when !canCommit", () => {
    const onCommit = vi.fn();
    renderWithAppUi(
      <AskCommitStrip canCommit={false} label="SEND — SET CENTER FIRST" onCommit={onCommit} />,
    );

    const button = screen.getByRole("button", {
      name: "SEND — SET CENTER FIRST",
    });
    expect(button).toHaveAttribute("data-armed", "false");
    expectUnavailablePrimary(button, onCommit);
  });

  it("arms Survey flag primary and commits when canCommit", () => {
    const onCommit = vi.fn();
    renderWithAppUi(<AskCommitStrip canCommit label="SEND · D2P1" onCommit={onCommit} />);

    const button = screen.getByRole("button", { name: "SEND · D2P1" });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("data-armed", "true");

    fireEvent.click(button);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("keeps busy (spinner + aria-busy) without native disable while submitting", () => {
    const onCommit = vi.fn();
    renderWithAppUi(
      <AskCommitStrip canCommit label="SEND · D2P1" onCommit={onCommit} isSubmitting />,
    );

    const button = screen.getByRole("button", { name: "Sending…" });
    expect(button).toHaveAttribute("data-armed", "false");
    expectBusyPrimary(button, onCommit);
  });

  it("shows optional inline error without arming when muted", () => {
    renderWithAppUi(
      <AskCommitStrip
        canCommit={false}
        label="SEND"
        onCommit={() => {}}
        error="Could not send. Try again."
      />,
    );

    expect(screen.getByText("Could not send. Try again.")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "SEND" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-describedby", "ask-commit-strip-error");
  });
});
