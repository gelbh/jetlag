import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { RolePicker } from "./RolePicker";

function renderPicker(ui: ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

describe("RolePicker", () => {
  it("shows seeker and hider tiles by default", () => {
    renderPicker(<RolePicker value="seeker" onChange={() => undefined} />);

    expect(screen.getByText("Choose your side")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Seeker/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Hider/ })).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("radio", { name: /Observer/ })).not.toBeInTheDocument();
  });

  it("includes observer when requested", () => {
    renderPicker(<RolePicker value="observer" onChange={() => undefined} includeObserver />);

    expect(screen.getByRole("radio", { name: /Observer/ })).toHaveAttribute("aria-checked", "true");
  });
});
