import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "../../theme/theme";
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

  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <AdminSessionFilters {...defaults} {...props} />
    </MantineProvider>,
  );
}

describe("AdminSessionFilters", () => {
  it("keeps mode and phase chips behind More filters by default", () => {
    renderFilters();

    expect(screen.getByRole("button", { name: "Live" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annotated" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More filters" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("button", { name: "Singleplayer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hiding" })).not.toBeInTheDocument();
  });

  it("reveals mode and phase chips when More filters is expanded", () => {
    renderFilters();

    fireEvent.click(screen.getByRole("button", { name: "More filters" }));

    expect(screen.getByRole("button", { name: "More filters" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: "Singleplayer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hiding" })).toBeInTheDocument();
  });
});
