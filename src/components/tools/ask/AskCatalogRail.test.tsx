import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { AskCatalogRail } from "./AskCatalogRail";

const ROWS = [
  { id: "transit", label: "Transit stop" },
  { id: "park", label: "Park" },
  { id: "museum", label: "Museum" },
] as const;

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

function renderRail(ui: React.ReactElement) {
  return render(
    <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

describe("AskCatalogRail", () => {
  it("advances via row select and has no CONTINUE sibling control", () => {
    const onSelect = vi.fn();
    renderRail(
      <AskCatalogRail rows={ROWS} selectedId={null} onSelect={onSelect} />,
    );

    expect(
      screen.queryByRole("button", { name: /continue/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Transit stop" }));
    expect(onSelect).toHaveBeenCalledWith("transit");
  });

  it("marks the selected row without requiring a second CTA", () => {
    const onSelect = vi.fn();
    const { container } = renderRail(
      <AskCatalogRail rows={ROWS} selectedId="park" onSelect={onSelect} />,
    );

    expect(screen.getByRole("button", { name: "Park" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.queryByRole("button", { name: /continue/i }),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector("[data-testid='ask-commit-strip']"),
    ).not.toBeInTheDocument();
  });

  it("mounts Mantine catalog shell and advances under flag", () => {
    const onSelect = vi.fn();
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <AskCatalogRail rows={ROWS} selectedId={null} onSelect={onSelect} />
      </MantineProvider>,
    );

    const rail = screen.getByTestId("ask-catalog-rail");
    expect(rail).toBeInTheDocument();
    const row = screen.getByRole("button", { name: "Museum" });
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith("museum");
  });

  it("renders group headings once per section without prefixing row labels", () => {
    const onSelect = vi.fn();
    renderRail(
      <AskCatalogRail
        columns={2}
        rows={[
          { id: "bus", label: "Bus stop", groupLabel: "Transit" },
          { id: "rail", label: "Rail station", groupLabel: "Transit" },
          { id: "park", label: "Park", groupLabel: "Nature" },
        ]}
        selectedId={null}
        onSelect={onSelect}
      />,
    );

    expect(screen.getAllByText("Transit")).toHaveLength(1);
    expect(screen.getByText("Nature")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Transit:/i }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector(".ask-catalog-rail__grid"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bus stop" }));
    expect(onSelect).toHaveBeenCalledWith("bus");
  });
});
