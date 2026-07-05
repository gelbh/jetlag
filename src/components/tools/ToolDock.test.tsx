import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToolDock } from "./ToolDock";
import { renderWithRouter } from "../../test/renderWithRouter";

describe("ToolDock", () => {
  it("exposes quick tools and overflow menu entries", () => {
    renderWithRouter(
      <ToolDock
        activeTool="none"
        onSelect={vi.fn()}
        canUndo={false}
        canRedo={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Pin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zone" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More map tools" }));

    expect(screen.getByRole("menuitem", { name: /Radar/i })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Measuring/i }),
    ).toBeInTheDocument();
  });
});
