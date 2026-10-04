import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { RolePicker } from "./RolePicker";

describe("RolePicker compact", () => {
  it("compact mode uses a segmented side control", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <RolePicker value="seeker" onChange={() => undefined} compact />
      </MantineProvider>,
    );
    expect(screen.getByRole("tablist", { name: "Your side" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Seeker" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Hider" })).toBeInTheDocument();
    expect(screen.queryByText(/Ask questions, mark the map/)).not.toBeInTheDocument();
  });
});
