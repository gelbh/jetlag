import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AskCommitStrip } from "./AskCommitStrip";

describe("AskCommitStrip", () => {
  it("stays muted and does not fire commit when !canCommit", () => {
    const onCommit = vi.fn();
    render(
      <AskCommitStrip
        canCommit={false}
        label="SEND — SET CENTER FIRST"
        onCommit={onCommit}
      />,
    );

    const button = screen.getByRole("button", {
      name: "SEND — SET CENTER FIRST",
    });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-armed", "false");
    expect(button.className).not.toMatch(/btn-primary/);

    fireEvent.click(button);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("arms terracotta primary and commits when canCommit", () => {
    const onCommit = vi.fn();
    render(
      <AskCommitStrip
        canCommit
        label="SEND · D2P1"
        onCommit={onCommit}
      />,
    );

    const button = screen.getByRole("button", { name: "SEND · D2P1" });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("data-armed", "true");
    expect(button.className).toMatch(/btn-primary/);

    fireEvent.click(button);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("shows optional inline error without arming when muted", () => {
    render(
      <AskCommitStrip
        canCommit={false}
        label="SEND"
        onCommit={() => {}}
        error="Could not send. Try again."
      />,
    );

    expect(screen.getByText("Could not send. Try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SEND" })).toBeDisabled();
  });
});
