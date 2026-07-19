import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FriendsPanel } from "./FriendsPanel";

const useDesktopLayout = vi.fn();
vi.mock("../../hooks/useDesktopLayout", () => ({
  useDesktopLayout: () => useDesktopLayout(),
}));

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

describe("FriendsPanel", () => {
  beforeEach(() => {
    useDesktopLayout.mockReset();
  });

  it("keeps stacked sections under 1024", async () => {
    useDesktopLayout.mockReturnValue(false);
    render(<FriendsPanel />);

    await waitFor(() => {
      expect(screen.getByText("seeker_one")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("friends-master-list")).not.toBeInTheDocument();
    expect(screen.queryByTestId("friends-detail-pane")).not.toBeInTheDocument();
    expect(screen.getByText("Accept")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("renders master–detail with 14rem list on desktop", async () => {
    useDesktopLayout.mockReturnValue(true);
    render(<FriendsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("friends-master-list")).toBeInTheDocument();
    });

    const list = screen.getByTestId("friends-master-list");
    expect(list.className).toMatch(/w-\[14rem\]/);
    expect(screen.getByRole("complementary", { name: /Friend detail/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Select a friend or request to see details/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  });
});
