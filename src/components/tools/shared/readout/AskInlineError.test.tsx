import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { AskInlineError, askInlineErrorCopy, isLocationInlineError } from "./AskInlineError";

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

  it("does not blame GPS for network request timeouts", () => {
    const message = "Request timed out after 15000ms.";
    const copy = askInlineErrorCopy(message);
    expect(copy.title).toBe("Connection timed out");
    expect(copy.detail.toLowerCase()).toContain("connection");
    expect(isLocationInlineError(message)).toBe(false);
  });
});

describe("AskInlineError", () => {
  it("renders a Mantine alert callout", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <AskInlineError message="Timed out while waiting for your location." />
      </MantineProvider>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByTestId("ask-inline-error")).toBeInTheDocument();
    expect(screen.getByText("Location timed out")).toBeInTheDocument();
  });
});
