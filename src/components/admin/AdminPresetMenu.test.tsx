import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CUSTOM_PRESET_ID,
  type DeskPreset,
} from "../../domain/admin/opsDeskLayout";
import { AdminPresetMenu } from "./AdminPresetMenu";

const userPresets: DeskPreset[] = [
  {
    id: "user-night",
    name: "Night shift",
    kind: "user",
    layout: {
      cols: 24,
      rowHeight: 24,
      stacks: [],
      hiddenPanelIds: [],
    },
  },
];

const baseProps = {
  activePresetId: CUSTOM_PRESET_ID,
  defaultPresetId: CUSTOM_PRESET_ID,
  presetOrder: [
    "session-watch",
    "incident-triage",
    "ops-overview",
    CUSTOM_PRESET_ID,
    "user-night",
  ],
  userPresets,
  onSelectPreset: vi.fn(),
  onSaveCurrent: vi.fn(),
  onDeleteUserPreset: vi.fn(),
  onSetDefault: vi.fn(),
  onReorderPresets: vi.fn(),
  onRenameUserPreset: vi.fn(),
  onOverwriteUserPreset: vi.fn(),
};

describe("AdminPresetMenu", () => {
  it("shows Scratch and user chips only — no stock catalog", () => {
    render(<AdminPresetMenu {...baseProps} />);
    expect(screen.getByRole("button", { name: "Scratch" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Night shift" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Session watch" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Incident triage" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ops overview" })).toBeNull();
  });

  it("selects via label without calling setDefault", () => {
    const onSelectPreset = vi.fn();
    const onSetDefault = vi.fn();
    render(
      <AdminPresetMenu
        {...baseProps}
        onSelectPreset={onSelectPreset}
        onSetDefault={onSetDefault}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Night shift" }));
    expect(onSelectPreset).toHaveBeenCalledWith("user-night");
    expect(onSetDefault).not.toHaveBeenCalled();
  });

  it("sets default via star without calling select", () => {
    const onSelectPreset = vi.fn();
    const onSetDefault = vi.fn();
    render(
      <AdminPresetMenu
        {...baseProps}
        onSelectPreset={onSelectPreset}
        onSetDefault={onSetDefault}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Set Night shift as default" }),
    );
    expect(onSetDefault).toHaveBeenCalledWith("user-night");
    expect(onSelectPreset).not.toHaveBeenCalled();
  });

  it("does not render always-on move chevrons in the idle strip", () => {
    render(<AdminPresetMenu {...baseProps} />);
    expect(
      screen.queryByRole("button", { name: /move .* earlier/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /move .* later/i }),
    ).toBeNull();
    expect(screen.queryByText("‹")).toBeNull();
    expect(screen.queryByText("›")).toBeNull();
  });

  it("Manage move earlier calls onReorderPresets with swapped order", () => {
    const onReorderPresets = vi.fn();
    render(
      <AdminPresetMenu {...baseProps} onReorderPresets={onReorderPresets} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Move Night shift earlier" }),
    );

    expect(onReorderPresets).toHaveBeenCalledWith([
      "user-night",
      CUSTOM_PRESET_ID,
    ]);
  });

  it("closes Manage on Escape", () => {
    render(<AdminPresetMenu {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    expect(screen.getByTestId("admin-ops-preset-manage")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("admin-ops-preset-manage")).toBeNull();
  });
});
