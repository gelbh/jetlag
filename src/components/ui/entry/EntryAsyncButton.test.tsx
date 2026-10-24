import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { createLoadTask } from "@/services/core/progress/loadTask";
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
    expect(button).toHaveAttribute("aria-describedby", screen.getByRole("status").id);
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
    expect(screen.getByRole("button", { name: "Confirm game area" })).toBeDisabled();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps caller aria-describedby when idle and merges it while busy", () => {
    const { rerender } = renderEntryButton(
      <EntryAsyncButton
        busy={false}
        idleLabel="SEND"
        busyLabel="Sending…"
        aria-describedby="ask-error"
        styles={filledStyles}
        onClick={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "SEND" })).toHaveAttribute(
      "aria-describedby",
      "ask-error",
    );

    rerender(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <EntryAsyncButton
          busy
          idleLabel="SEND"
          busyLabel="Sending…"
          aria-describedby="ask-error"
          styles={filledStyles}
          onClick={() => {}}
        />
      </MantineProvider>,
    );
    const button = screen.getByRole("button", { name: "Sending…" });
    const describedBy = button.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(" ")).toEqual(
      expect.arrayContaining([screen.getByRole("status").id, "ask-error"]),
    );
  });
});

describe("EntryAsyncButton with a load task", () => {
  it("shows the stage as its label and draws progress inside the button", async () => {
    const task = createLoadTask({ label: "Creating game", cancellable: false });
    task
      .stage({
        kind: "fetch",
        label: "Creating session",
        historyKey: "test:create",
        expectedMs: 4_000,
      })
      .start();
    renderEntryButton(
      <EntryAsyncButton
        busy
        task={task}
        idleLabel="Create game"
        busyLabel="Creating…"
        styles={filledStyles}
        onClick={() => {}}
      />,
    );

    // Task snapshots refresh on the next animation frame.
    const button = await screen.findByRole("button", { name: /Creating session…/ });
    // Native <progress> for assistive tech, outside the button so it stays out of its name.
    const progress = screen.getByRole("progressbar", { name: "Creating game" });
    expect(progress.tagName).toBe("PROGRESS");
    expect(button).not.toContainElement(progress);
    expect(progress).toHaveAttribute("max", "100");
    expect(screen.getByRole("status").textContent).toBe("Creating session");
  });

  it("falls back to the busy label once the task has finished", () => {
    const task = createLoadTask({ label: "Creating game", cancellable: false });
    task.complete();
    renderEntryButton(
      <EntryAsyncButton
        busy
        task={task}
        idleLabel="Create game"
        busyLabel="Creating…"
        styles={filledStyles}
        onClick={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Creating…" })).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
