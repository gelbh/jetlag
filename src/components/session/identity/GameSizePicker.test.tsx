import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { GameSizePicker } from "./GameSizePicker";

/** ~big enough that recommendGameSize returns large. */
const LARGE_AREA = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-10, 50],
      [10, 50],
      [10, 60],
      [-10, 60],
      [-10, 50],
    ],
  ],
};

function renderPicker(
  props: Partial<ComponentProps<typeof GameSizePicker>> &
    Pick<ComponentProps<typeof GameSizePicker>, "value" | "onChange">,
) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <GameSizePicker gameArea={LARGE_AREA} compact {...props} />
    </MantineProvider>,
  );
}

describe("GameSizePicker remount override", () => {
  it("skips recommend overwrite when parent userOverrode is true", async () => {
    const onChange = vi.fn();
    renderPicker({ value: "small", onChange, userOverrode: true });

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Game size" })).toHaveValue("small");
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps a host choice across remount when userOverrode is lifted", async () => {
    const onChange = vi.fn();
    const { unmount } = renderPicker({ value: "small", onChange, userOverrode: true });
    expect(onChange).not.toHaveBeenCalled();
    unmount();

    const onChangeRemount = vi.fn();
    renderPicker({ value: "small", onChange: onChangeRemount, userOverrode: true });
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Game size" })).toHaveValue("small");
    });
    expect(onChangeRemount).not.toHaveBeenCalled();
  });

  it("recommends on first mount when not overridden", async () => {
    const onChange = vi.fn();
    renderPicker({ value: "medium", onChange });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("large");
    });
  });
});
