import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RoleCodeStamp } from "./RoleCodeStamp";

describe("RoleCodeStamp", () => {
  it("shows masked bullets and reveal calls onReveal", () => {
    const onReveal = vi.fn();

    render(
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

    render(
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

    render(
      <RoleCodeStamp
        roleLabel="Observer code"
        code={null}
        onReveal={vi.fn()}
        onRegenerate={onRegenerate}
        onCopy={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it("disables actions while busy", () => {
    render(
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
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeDisabled();
  });
});
