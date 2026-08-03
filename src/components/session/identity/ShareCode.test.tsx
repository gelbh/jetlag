import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareCode } from "./ShareCode";
import { renderWithRouter } from "../../../test/renderWithRouter";
import { copyToClipboard } from "../../../platform/copyToClipboard";

vi.mock("../../../platform/copyToClipboard", () => ({
  copyToClipboard: vi.fn(),
}));

describe("ShareCode", () => {
  beforeEach(() => {
    vi.mocked(copyToClipboard).mockReset();
    vi.mocked(copyToClipboard).mockResolvedValue(true);
    vi.stubGlobal("location", {
      ...window.location,
      origin: "https://play.example.com",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("displays the session code", () => {
    renderWithRouter(<ShareCode code="WXYZ" remote />);
    expect(screen.getByText("WXYZ")).toBeInTheDocument();
    expect(
      screen.getByText(/Tap code to copy\. Invite friends with the join link\./),
    ).toBeInTheDocument();
  });

  it("shares the join URL when native share is available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share });

    renderWithRouter(<ShareCode code="WXYZ" remote />);
    fireEvent.click(screen.getByRole("button", { name: "Invite friends" }));

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith({
        title: "Join my Hide+Seek session",
        text: "Join with code WXYZ",
        url: "https://play.example.com/join?code=WXYZ",
      });
    });
    expect(copyToClipboard).not.toHaveBeenCalled();
  });

  it("copies the join URL when native share is unavailable", async () => {
    vi.stubGlobal("navigator", { ...navigator, share: undefined });

    renderWithRouter(<ShareCode code="WXYZ" remote />);
    fireEvent.click(screen.getByRole("button", { name: "Invite friends" }));

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledWith(
        "https://play.example.com/join?code=WXYZ",
      );
    });
    expect(screen.getByText("Join link copied.")).toBeInTheDocument();
  });

  it("uses the public site origin for localhost WebView hosts", async () => {
    vi.stubGlobal("location", {
      ...window.location,
      origin: "https://localhost",
    });
    vi.stubGlobal("navigator", { ...navigator, share: undefined });

    renderWithRouter(<ShareCode code="WXYZ" remote />);
    fireEvent.click(screen.getByRole("button", { name: "Copy join link" }));

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledWith(
        "https://jetlag.gelbhart.dev/join?code=WXYZ",
      );
    });
  });

  it("does not fall back to clipboard when native share is cancelled", async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException("Share canceled", "AbortError"));
    vi.stubGlobal("navigator", { ...navigator, share });

    renderWithRouter(<ShareCode code="WXYZ" remote />);
    fireEvent.click(screen.getByRole("button", { name: "Invite friends" }));

    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(copyToClipboard).not.toHaveBeenCalled();
  });

  it("shows failure feedback when copying the join link fails", async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(false);
    vi.stubGlobal("navigator", { ...navigator, share: undefined });

    renderWithRouter(<ShareCode code="WXYZ" remote />);
    fireEvent.click(screen.getByRole("button", { name: "Copy join link" }));

    await waitFor(() => {
      expect(screen.getByText("Couldn't copy the join link.")).toBeInTheDocument();
    });
  });

  it("hides invite actions for local-only sessions", () => {
    renderWithRouter(<ShareCode code="WXYZ" remote={false} />);
    expect(
      screen.queryByRole("button", { name: "Invite friends" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Copy join link" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Local-only session for solo play/),
    ).toBeInTheDocument();
  });
});
