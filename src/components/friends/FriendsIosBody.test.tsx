import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { FriendsIosBody } from "./FriendsIosBody";
import { searchFriends } from "../../services/profile/profileFriends";

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
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <FriendsIosBody />
      </MantineProvider>
    </MemoryRouter>,
  );
}

describe("FriendsIosBody", () => {
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

    expect(
      screen.getByText("Enter at least 2 characters to search."),
    ).toBeInTheDocument();
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
    expect(
      screen.getByRole("button", { name: "Request bob" }),
    ).toBeInTheDocument();
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
});
