import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { SheetHost } from "./SheetHost";

function withAppUi(ui: ReactNode) {
  return (
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>
  );
}

describe("SheetHost", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
  });

  it("uses Mantine Drawer for open sheets", () => {
    render(
      withAppUi(
        <SheetHost open onClose={() => {}} ariaLabel="Settings">
          <p>mantine body</p>
        </SheetHost>,
      ),
    );
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("mantine body")).toBeInTheDocument();
    expect(screen.getByTestId("mantine-drawer-sheet")).toBeInTheDocument();
  });

  it("ignores deprecated railTab and still uses Drawer", () => {
    render(
      withAppUi(
        <SheetHost open onClose={() => {}} ariaLabel="Settings" railTab="settings">
          <p>drawer body</p>
        </SheetHost>,
      ),
    );
    expect(screen.getByTestId("mantine-drawer-sheet")).toBeInTheDocument();
    expect(screen.getByText("drawer body")).toBeInTheDocument();
  });

  it("closes via overlay when sheet requests close", () => {
    const onClose = vi.fn();
    render(
      withAppUi(
        <SheetHost open onClose={onClose} ariaLabel="Settings">
          <p>body</p>
        </SheetHost>,
      ),
    );
    const overlay = document.querySelector(".mantine-Drawer-overlay");
    expect(overlay).toBeTruthy();
    fireEvent.mouseDown(overlay!);
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalled();
  });

  it("restores map pointer events after Mantine Drawer closes (Verify #4)", async () => {
    const mapHit = vi.fn();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button
            type="button"
            data-testid="map-target"
            style={{ pointerEvents: "auto" }}
            onClick={mapHit}
          >
            map
          </button>
          <SheetHost open={open} onClose={() => setOpen(false)} ariaLabel="Settings">
            <p>settings body</p>
            <button type="button" onClick={() => setOpen(false)}>
              close-sheet
            </button>
          </SheetHost>
        </>
      );
    }

    render(withAppUi(<Harness />));

    expect(screen.getByTestId("mantine-drawer-sheet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "close-sheet" }));

    await waitFor(() => {
      expect(screen.queryByTestId("mantine-drawer-sheet")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument();

    const leftoverOverlay = document.querySelector(
      ".mantine-Drawer-overlay, .mantine-Modal-overlay, [data-mantine-overlay]",
    );
    expect(leftoverOverlay).toBeNull();

    fireEvent.click(screen.getByTestId("map-target"));
    expect(mapHit).toHaveBeenCalledTimes(1);
  });

  it("applies consumer maxHeightClassName on Mantine Drawer content", () => {
    render(
      withAppUi(
        <SheetHost
          open
          onClose={() => {}}
          ariaLabel="Tall settings"
          maxHeightClassName="max-h-[min(85dvh,760px)]"
        >
          <p>tall body</p>
        </SheetHost>,
      ),
    );
    const content = document.querySelector(".mantine-drawer-sheet");
    expect(content?.className).toMatch(/max-h-\[min\(85dvh,760px\)\]/);
  });
});
