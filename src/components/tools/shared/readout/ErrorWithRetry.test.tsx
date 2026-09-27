import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { ErrorWithRetry } from "./ErrorWithRetry";

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

describe("ErrorWithRetry", () => {
  it("renders the error and calls onRetry", () => {
    const onRetry = vi.fn();
    const { container } = render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <ErrorWithRetry error="Matching failed" onRetry={onRetry} />
      </MantineProvider>,
    );

    expect(container.querySelector(".mantine-Alert-root")).toBeTruthy();
    expect(screen.getByText("Matching failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
