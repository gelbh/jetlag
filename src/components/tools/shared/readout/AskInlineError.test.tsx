import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { AskInlineError, askInlineErrorCopy } from "./AskInlineError";

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

describe("askInlineErrorCopy", () => {
  it("rewrites GPS timeout into actionable copy", () => {
    const copy = askInlineErrorCopy("Timed out while waiting for your location.");
    expect(copy.title).toBe("Location timed out");
    expect(copy.detail.toLowerCase()).toContain("tap the map");
  });
});

describe("AskInlineError", () => {
  it("renders a Mantine alert callout", () => {
    const { container } = render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <AskInlineError message="Timed out while waiting for your location." />
      </MantineProvider>,
    );
    expect(container.querySelector(".mantine-Alert-root")).toBeTruthy();
    expect(screen.getByTestId("ask-inline-error")).toBeInTheDocument();
    expect(screen.getByText("Location timed out")).toBeInTheDocument();
  });
});
