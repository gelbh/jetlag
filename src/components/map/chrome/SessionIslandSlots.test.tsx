import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
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

  it("shows Codes in More when onOpenCodes is provided and opens on tap", async () => {
    const onOpenCodes = vi.fn();

    renderWithAppUi(<SessionIslandSlots onOpenSettings={vi.fn()} onOpenCodes={onOpenCodes} />);

    fireEvent.click(screen.getByRole("button", { name: "More session tools" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Open role codes" }));
    expect(onOpenCodes).toHaveBeenCalledTimes(1);
  });

  it("closes More when the session island becomes inactive", async () => {
    const view = renderWithAppUi(
      <SessionIslandSlots onOpenSettings={vi.fn()} onOpenCodes={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "More session tools" }));
    expect(await screen.findByRole("menu", { name: "More session tools" })).toBeInTheDocument();

    view.rerender(<SessionIslandSlots inactive onOpenSettings={vi.fn()} onOpenCodes={vi.fn()} />);
    await waitFor(() => {
      expect(screen.queryByRole("menu", { name: "More session tools" })).not.toBeInTheDocument();
    });

    view.rerender(<SessionIslandSlots onOpenSettings={vi.fn()} onOpenCodes={vi.fn()} />);
    expect(screen.queryByRole("menu", { name: "More session tools" })).not.toBeInTheDocument();
  });

  it("hides Codes and More when onOpenCodes is omitted", () => {
    renderWithAppUi(<SessionIslandSlots onOpenSettings={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "More session tools" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open role codes" })).not.toBeInTheDocument();
  });
});
