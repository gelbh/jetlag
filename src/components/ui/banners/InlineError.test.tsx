import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
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
  it("uses GPS title and detail for location timeouts", () => {
    renderInline(<InlineError>Timed out while waiting for your location.</InlineError>);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Location timed out")).toBeInTheDocument();
    expect(screen.getByText(/tap the map/i)).toBeInTheDocument();
  });
});
