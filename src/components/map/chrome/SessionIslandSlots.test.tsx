import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionIslandSlots } from "./SessionIslandSlots";

describe("SessionIslandSlots", () => {
  it("shows Codes when onOpenCodes is provided and opens on tap", () => {
    const onOpenCodes = vi.fn();

    render(
      <SessionIslandSlots
        onOpenSettings={vi.fn()}
        onOpenCodes={onOpenCodes}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open role codes" }));
    expect(onOpenCodes).toHaveBeenCalledTimes(1);
  });

  it("hides Codes when onOpenCodes is omitted", () => {
    render(<SessionIslandSlots onOpenSettings={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "Open role codes" }),
    ).not.toBeInTheDocument();
  });
});
