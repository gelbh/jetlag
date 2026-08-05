import { describe, expect, it, vi } from "vitest";
import { FirebaseError } from "firebase/app";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BoardEconomyOpsToggle } from "./BoardEconomyOpsToggle";

const updateMock = vi.hoisted(() => vi.fn());

vi.mock("../../../services/firestore/boardEconomy", () => ({
  updateBoardEconomyEnabled: updateMock,
}));

describe("BoardEconomyOpsToggle", () => {
  it("surfaces permission-denied with timer/membership guidance", async () => {
    updateMock.mockRejectedValueOnce(
      new FirebaseError("permission-denied", "Missing or insufficient permissions."),
    );
    render(<BoardEconomyOpsToggle sessionId="s1" enabled={false} />);

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /Simulate hider deck/i,
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/permission denied/i);
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/hide timer/i);
  });

  it("shows disabledReason when timer-locked", () => {
    render(
      <BoardEconomyOpsToggle
        sessionId="s1"
        enabled={false}
        disabled
        disabledReason="Hide timer already started — locked."
      />,
    );
    expect(
      screen.getByText(/Hide timer already started — locked/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Simulate hider deck/i }),
    ).toBeDisabled();
  });
});
