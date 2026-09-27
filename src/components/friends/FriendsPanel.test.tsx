import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { FriendsPanel } from "./FriendsPanel";
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
}));

function renderPanel() {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <FriendsPanel />
    </MantineProvider>,
  );
}

describe("FriendsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps stacked sections (phone shell)", async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText("seeker_one")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("friends-master-list")).not.toBeInTheDocument();
    expect(screen.queryByTestId("friends-detail-pane")).not.toBeInTheDocument();
    expect(screen.getByText("Accept")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("blocks search and shows an error for short queries", async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText("seeker_one")).toBeInTheDocument();
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
});
