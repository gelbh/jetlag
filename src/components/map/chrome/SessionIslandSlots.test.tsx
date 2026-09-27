import { fireEvent, screen } from "@testing-library/react";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { describe, expect, it, vi } from "vitest";
import { SessionIslandSlots } from "./SessionIslandSlots";

describe("SessionIslandSlots", () => {
  it("puts Settings above other session tools", () => {
    renderWithAppUi(
      <SessionIslandSlots
        onOpenSettings={vi.fn()}
        onOpenChat={vi.fn()}
        onOpenLog={vi.fn()}
        onOpenCodes={vi.fn()}
      />,
    );
    const labels = screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"));
    expect(labels[0]).toBe("Open settings");
  });

  it("shows Codes when onOpenCodes is provided and opens on tap", () => {
    const onOpenCodes = vi.fn();

    renderWithAppUi(
      <SessionIslandSlots
        onOpenSettings={vi.fn()}
        onOpenCodes={onOpenCodes}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open role codes" }));
    expect(onOpenCodes).toHaveBeenCalledTimes(1);
  });

  it("hides Codes when onOpenCodes is omitted", () => {
    renderWithAppUi(<SessionIslandSlots onOpenSettings={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "Open role codes" }),
    ).not.toBeInTheDocument();
  });
});
