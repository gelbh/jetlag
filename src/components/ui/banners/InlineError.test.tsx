import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { InlineError } from "./InlineError";

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

function renderInline(ui: ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

describe("InlineError", () => {
  it("renders children as a Mantine alert", () => {
    const { container } = renderInline(<InlineError>Could not join</InlineError>);

    expect(container.querySelector(".mantine-Alert-root")).toBeTruthy();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Could not join")).toBeInTheDocument();
  });

  it("uses GPS title and detail for location timeouts", () => {
    const { container } = renderInline(
      <InlineError>Timed out while waiting for your location.</InlineError>,
    );

    expect(container.querySelector(".mantine-Alert-root")).toBeTruthy();
    expect(screen.getByText("Location timed out")).toBeInTheDocument();
    expect(screen.getByText(/tap the map/i)).toBeInTheDocument();
  });
});
