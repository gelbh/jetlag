import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { CastleSiegeSeatPicker } from "./CastleSiegeSeatPicker";

function renderPicker(value: "teamA" | "teamB" | "referee" | "observer" = "teamA") {
  const onChange = vi.fn();
  render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <CastleSiegeSeatPicker value={value} onChange={onChange} />
    </MantineProvider>,
  );
  return { onChange };
}

describe("CastleSiegeSeatPicker", () => {
  it("lists CS seats and marks the selected seat", () => {
    renderPicker("teamB");

    expect(screen.getByRole("radio", { name: /Team A/i })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /Team B/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Referee/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Observer/i })).toBeInTheDocument();
  });

  it("calls onChange when a seat is chosen", () => {
    const { onChange } = renderPicker("teamA");

    fireEvent.click(screen.getByRole("radio", { name: /Referee/i }));

    expect(onChange).toHaveBeenCalledWith("referee");
  });
});
