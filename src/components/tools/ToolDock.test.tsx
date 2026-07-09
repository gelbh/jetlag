import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToolDock } from "./ToolDock";
import { ToolOverflowSheet } from "./ToolOverflowSheet";
import { renderWithRouter } from "../../test/renderWithRouter";

describe("ToolDock", () => {
  it("exposes question tools on the dock and markup tools in Draw", () => {
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

    expect(screen.getByRole("button", { name: "Matching" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Measuring" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Radar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pin" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Draw on map" }));

    expect(screen.getByRole("menuitem", { name: /Pin/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Zone/i })).toBeInTheDocument();
  });

  it("shows unread badge on chat and more buttons when hasUnreadChat is true", () => {
    renderWithRouter(
      <ToolDock
        activeTool="none"
        onSelect={vi.fn()}
        canUndo={false}
        canRedo={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenChat={vi.fn()}
        hasUnreadChat
        unreadCount={1}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Open chat, unread messages" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "More tools, unread chat" }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll(".jl-unread-badge")).toHaveLength(2);
  });

  it("hides unread badge when hasUnreadChat is false", () => {
    renderWithRouter(
      <ToolDock
        activeTool="none"
        onSelect={vi.fn()}
        canUndo={false}
        canRedo={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenChat={vi.fn()}
        hasUnreadChat={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Open chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More tools" })).toBeInTheDocument();
    expect(document.querySelector(".jl-unread-badge")).toBeNull();
  });
});

describe("ToolOverflowSheet", () => {
  const baseProps = {
    open: true,
    onClose: vi.fn(),
    activeTool: "none" as const,
    onSelect: vi.fn(),
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onOpenSettings: vi.fn(),
    mapStyle: "standard" as const,
    onMapStyleChange: vi.fn(),
    onOpenChat: vi.fn(),
  };

  it("renders overflow rows with icons and hints", () => {
    renderWithRouter(<ToolOverflowSheet {...baseProps} />);

    expect(screen.getByRole("dialog", { name: "More tools" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zone" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pin" })).toBeInTheDocument();
    expect(screen.getByText("Draw a play boundary")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open chat" })).toBeInTheDocument();
  });

  it("shows unread badge on chat row when hasUnreadChat is true", () => {
    renderWithRouter(
      <ToolOverflowSheet {...baseProps} hasUnreadChat unreadCount={1} />
    );

    expect(
      screen.getByRole("button", { name: "Open chat, unread messages" }),
    ).toBeInTheDocument();
    expect(document.querySelector(".jl-unread-badge")).toBeInTheDocument();
  });

  it("disables undo when canUndo is false", () => {
    renderWithRouter(<ToolOverflowSheet {...baseProps} canUndo={false} />);

    expect(screen.getByRole("button", { name: "Undo last annotation" })).toBeDisabled();
  });

  it("calls onUndo and closes when undo is enabled", () => {
    const onUndo = vi.fn();
    const onClose = vi.fn();

    renderWithRouter(
      <ToolOverflowSheet
        {...baseProps}
        canUndo
        onUndo={onUndo}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Undo last annotation" }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("returns null when closed", () => {
    renderWithRouter(<ToolOverflowSheet {...baseProps} open={false} />);

    expect(screen.queryByRole("dialog", { name: "More tools" })).not.toBeInTheDocument();
  });
});
