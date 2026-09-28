import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { ReactElement } from "react";
import { jetlagTheme } from "@/theme/theme";
import { EntryAsyncButton } from "./EntryAsyncButton";
import { filledStyles } from "./entryStyles";

function renderEntryButton(ui: ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

describe("EntryAsyncButton", () => {
  it("shows busyLabel visibly and does not natively disable for busy alone", () => {
    renderEntryButton(
      <EntryAsyncButton
        busy
        idleLabel="Confirm game area"
        busyLabel="Creating…"
        styles={filledStyles}
        onClick={() => {}}
      />,
    );
    const button = screen.getByRole("button", { name: "Creating…" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Creating…");
    expect(button).toHaveAttribute(
      "aria-describedby",
      screen.getByRole("status").id,
    );
  });

  it("ignores click while busy", () => {
    const onClick = vi.fn();
    renderEntryButton(
      <EntryAsyncButton
        busy
        idleLabel="Confirm game area"
        busyLabel="Creating…"
        styles={filledStyles}
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Creating…" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("blocks form submit while busy (Enter / implicit submit)", () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    renderEntryButton(
      <form onSubmit={onSubmit}>
        <input aria-label="Session code" defaultValue="ABCD" />
        <EntryAsyncButton
          type="submit"
          busy
          idleLabel="Join session"
          busyLabel="Joining…"
          styles={filledStyles}
        />
      </form>,
    );
    fireEvent.submit(screen.getByRole("button", { name: "Joining…" }).closest("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("natively disables when unavailable and idle", () => {
    renderEntryButton(
      <EntryAsyncButton
        busy={false}
        unavailable
        idleLabel="Confirm game area"
        busyLabel="Creating…"
        styles={filledStyles}
        onClick={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Confirm game area" }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("");
  });
});
