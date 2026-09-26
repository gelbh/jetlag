import { fireEvent, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { renderWithRouter } from "@/test/renderWithRouter";
import { RoleCodeStamp } from "./RoleCodeStamp";

function renderUi(ui: ReactElement) {
  return renderWithRouter(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

describe("RoleCodeStamp", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("shows masked bullets and reveal calls onReveal", () => {
    const onReveal = vi.fn();

    renderUi(
      <RoleCodeStamp
        roleLabel="Seeker code"
        code={null}
        onReveal={onReveal}
        onRegenerate={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.getByText("Seeker code")).toBeInTheDocument();
    expect(screen.getByText("••••")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Reveal Seeker code/i }));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("revealed tap calls onCopy", () => {
    const onCopy = vi.fn();

    renderUi(
      <RoleCodeStamp
        roleLabel="Hider code"
        code="ABCD"
        onReveal={vi.fn()}
        onRegenerate={vi.fn()}
        onCopy={onCopy}
      />,
    );

    expect(screen.getByText("ABCD")).toBeInTheDocument();
    expect(screen.queryByText("••••")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Copy Hider code/i }));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("wires regenerate", () => {
    const onRegenerate = vi.fn();

    renderUi(
      <RoleCodeStamp
        roleLabel="Observer code"
        code={null}
        onReveal={vi.fn()}
        onRegenerate={onRegenerate}
        onCopy={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Regenerate Observer code/i }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it("disables actions while busy", () => {
    renderUi(
      <RoleCodeStamp
        roleLabel="Seeker code"
        code={null}
        busy
        onReveal={vi.fn()}
        onRegenerate={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Reveal Seeker code/i }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /Regenerate Seeker code/i })).toBeDisabled();
  });
});
