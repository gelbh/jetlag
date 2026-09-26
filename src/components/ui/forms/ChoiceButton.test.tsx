import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { ChoiceButton } from "./ChoiceButton";

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

describe("ChoiceButton", () => {
  it("mounts Mantine chip", () => {
    const onClick = vi.fn();
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <ChoiceButton selected onClick={onClick}>
          Match
        </ChoiceButton>
      </MantineProvider>,
    );
    const button = screen.getByRole("button", { name: "Match" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
