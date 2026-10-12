import { fireEvent, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { AdminWorld } from "@/components/admin/shared/AdminWorld";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { AdminSessionFilters } from "./AdminSessionFilters";

function renderFilters(props: Partial<ComponentProps<typeof AdminSessionFilters>> = {}) {
  const defaults = {
    query: "",
    liveOnly: true,
    annotatedOnly: false,
    mode: "all" as const,
    state: null,
    sort: "lastActivity" as const,
    onQueryChange: vi.fn(),
    onLiveOnlyChange: vi.fn(),
    onAnnotatedOnlyChange: vi.fn(),
    onModeChange: vi.fn(),
    onStateChange: vi.fn(),
    onSortChange: vi.fn(),
  };

  return renderWithAppUi(
    <AdminWorld>
      <AdminSessionFilters {...defaults} {...props} />
    </AdminWorld>,
  );
}

describe("AdminSessionFilters", () => {
  it("keeps mode and phase chips behind More filters by default", () => {
    renderFilters();

    expect(screen.getByRole("checkbox", { name: "Live" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Annotated" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sort" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More filters" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("checkbox", { name: "Singleplayer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Hiding" })).not.toBeInTheDocument();
  });

  // Floating UI hides the jsdom dropdown as detached (zero rects), so its content queries use `hidden`.
  it("reveals mode and phase chips when More filters is expanded", async () => {
    renderFilters();

    const more = screen.getByRole("button", { name: "More filters" });
    fireEvent.click(more);

    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(
      await screen.findByRole("checkbox", { name: "Singleplayer", hidden: true }),
    ).toBeInTheDocument();
    expect(document.getElementById(more.getAttribute("aria-controls") ?? "")).not.toBeNull();
    expect(screen.getByRole("checkbox", { name: "Hiding", hidden: true })).toBeInTheDocument();
  });

  it("exposes chip state as checked and deselects back to all", async () => {
    const onModeChange = vi.fn();
    const onLiveOnlyChange = vi.fn();
    renderFilters({
      liveOnly: true,
      annotatedOnly: false,
      mode: "multiplayer",
      onModeChange,
      onLiveOnlyChange,
    });

    expect(screen.getByRole("checkbox", { name: "Live" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Annotated" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Live" }));
    expect(onLiveOnlyChange).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: "More filters" }));
    const multiplayer = await screen.findByRole("checkbox", { name: "Multiplayer", hidden: true });
    expect(multiplayer).toBeChecked();
    fireEvent.click(multiplayer);
    expect(onModeChange).toHaveBeenCalledWith("all");
  });
});
