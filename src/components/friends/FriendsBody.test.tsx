import { MantineProvider } from "@mantine/core";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "@/platform/copyToClipboard";
import { jetlagTheme } from "@/theme/theme";
import { searchFriends } from "../../services/profile/profileFriends";
import { FriendsBody } from "./FriendsBody";

const trackLazy = vi.hoisted(() => vi.fn());

vi.mock("@/services/core/analytics/lazyTelemetry", () => ({ trackLazy }));
vi.mock("@/platform/copyToClipboard", () => ({ copyToClipboard: vi.fn() }));

vi.mock("../../services/profile/profileFriends", () => ({
  listFriends: vi.fn(async () => ({
    friends: [{ uid: "f1", username: "ally" }],
    incoming: [{ uid: "i1", username: "seeker_one" }],
    outgoing: [{ uid: "o1", username: "pending_pal" }],
  })),
  searchFriends: vi.fn(async () => ({ results: [] })),
  requestFriend: vi.fn(async () => ({ ok: true })),
  acceptFriendRequest: vi.fn(async () => ({ ok: true })),
  declineFriendRequest: vi.fn(async () => ({ ok: true })),
  cancelFriendRequest: vi.fn(async () => ({ ok: true })),
  removeFriend: vi.fn(async () => ({ ok: true })),
}));

function renderBody() {
  return render(
    <MemoryRouter>
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <FriendsBody />
      </MantineProvider>
    </MemoryRouter>,
  );
}

describe("FriendsBody", () => {
  beforeEach(() => {
    localStorage.removeItem("jl.friends.mock");
    vi.mocked(searchFriends).mockClear();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  it("shows field error and skips search for short queries", async () => {
    renderBody();

    await waitFor(() => {
      expect(screen.getByText("ally")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Search username"), {
      target: { value: "a" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByText("Enter at least 2 characters to search.")).toBeInTheDocument();
    expect(searchFriends).not.toHaveBeenCalled();
  });

  it("searches with a normalized query when valid", async () => {
    vi.mocked(searchFriends).mockResolvedValueOnce({
      results: [{ uid: "u2", username: "bob" }],
    });
    renderBody();

    await waitFor(() => {
      expect(screen.getByText("ally")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Search username"), {
      target: { value: "Bo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(searchFriends).toHaveBeenCalledWith("bo");
    });
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request bob" })).toBeInTheDocument();
  });

  it("defaults to Friends and can switch to Incoming", async () => {
    renderBody();

    await waitFor(() => {
      expect(screen.getByText("ally")).toBeInTheDocument();
    });
    expect(screen.queryByText("seeker_one")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Incoming/i }));
    expect(screen.getByText("seeker_one")).toBeInTheDocument();
    expect(screen.queryByText("ally")).not.toBeInTheDocument();
  });

  it("keeps the incoming request sheet open after tap", async () => {
    renderBody();

    await waitFor(() => {
      expect(screen.getByText("ally")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("radio", { name: /Incoming/i }));
    fireEvent.click(screen.getByText("seeker_one"));

    expect(await screen.findByRole("button", { name: "Accept request" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();

    const sheet = document.querySelector(".mantine-Drawer-content");
    expect(sheet).toBeTruthy();
    expect((sheet as HTMLElement).style.flex).toContain("100%");
  });

  it("shows friend play actions and remove confirm in the sheet", async () => {
    localStorage.setItem("jl.friends.mock", "1");
    renderBody();

    await waitFor(() => {
      expect(screen.getByText("ally")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("ally"));

    expect(await screen.findByRole("button", { name: /Invite to PLAY/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start new game" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View on leaderboard/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove friend" }));
    expect(screen.getByRole("button", { name: "Confirm remove" })).toBeInTheDocument();
  });

  describe("invite to session analytics", () => {
    beforeEach(() => {
      localStorage.setItem("jl.friends.mock", "1");
      trackLazy.mockReset();
      vi.mocked(copyToClipboard).mockReset();
      vi.mocked(copyToClipboard).mockResolvedValue(true);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    async function clickInvite() {
      renderBody();
      await waitFor(() => {
        expect(screen.getByText("ally")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("ally"));
      fireEvent.click(await screen.findByRole("button", { name: /Invite to PLAY/i }));
    }

    it("tracks invite_shared after a native share resolves", async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { ...navigator, share });

      await clickInvite();

      await waitFor(() => {
        expect(trackLazy).toHaveBeenCalledWith("invite_shared", { method: "native_share" });
      });
      expect(trackLazy).toHaveBeenCalledOnce();
    });

    it("does not track invite_shared when native share is cancelled", async () => {
      const share = vi.fn().mockRejectedValue(new DOMException("Share canceled", "AbortError"));
      vi.stubGlobal("navigator", { ...navigator, share });

      await clickInvite();

      await waitFor(() => expect(share).toHaveBeenCalled());
      await act(async () => {
        await share.mock.results[0]?.value.catch(() => undefined);
      });
      expect(copyToClipboard).not.toHaveBeenCalled();
      expect(trackLazy).not.toHaveBeenCalled();
    });

    it("tracks invite_shared after the clipboard fallback copies the link", async () => {
      vi.stubGlobal("navigator", { ...navigator, share: undefined });

      await clickInvite();

      await waitFor(() => {
        expect(trackLazy).toHaveBeenCalledWith("invite_shared", { method: "copy_link" });
      });
      expect(trackLazy).toHaveBeenCalledOnce();
    });

    it("does not track invite_shared when the clipboard fallback fails", async () => {
      vi.mocked(copyToClipboard).mockResolvedValue(false);
      vi.stubGlobal("navigator", { ...navigator, share: undefined });

      await clickInvite();

      await waitFor(() => expect(copyToClipboard).toHaveBeenCalled());
      await act(async () => {
        await vi.mocked(copyToClipboard).mock.results[0]?.value;
      });
      expect(trackLazy).not.toHaveBeenCalled();
    });
  });
});
