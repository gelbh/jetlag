import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { GameSizePicker } from "./GameSizePicker";

function renderPicker(ui: ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

describe("GameSizePicker compact", () => {
  it("shows Small Medium Large tiles instead of a native select", () => {
    renderPicker(
      <GameSizePicker gameArea={null} value="medium" onChange={() => undefined} compact />,
    );

    expect(screen.getByRole("radiogroup", { name: "Game size" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Small/ })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /Medium/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Large/ })).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("combobox", { name: "Game size" })).not.toBeInTheDocument();
  });
});
