import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFriendsPanelModel } from "./useFriendsPanelModel";

const searchFriends = vi.fn();
const listFriends = vi.fn();

vi.mock("../../services/profile/profileFriends", () => ({
  listFriends: (...args: unknown[]) => listFriends(...args),
  searchFriends: (...args: unknown[]) => searchFriends(...args),
  acceptFriendRequest: vi.fn(),
  cancelFriendRequest: vi.fn(),
  declineFriendRequest: vi.fn(),
  removeFriend: vi.fn(),
  requestFriend: vi.fn(),
}));

vi.mock("../../services/device/feedbackService", () => ({
  feedback: vi.fn(),
}));

describe("useFriendsPanelModel live search", () => {
  beforeEach(() => {
    listFriends.mockResolvedValue({
      friends: [],
      incoming: [],
      outgoing: [],
    });
    searchFriends.mockReset();
  });

  it("clears stale results when the debounced query becomes too short", async () => {
    let resolveSearch: ((value: { results: { uid: string; username: string }[] }) => void) | null =
      null;
    searchFriends.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve;
        }),
    );

    const { result } = renderHook(() => useFriendsPanelModel());

    await waitFor(() => {
      expect(result.current.loadingList).toBe(false);
    });

    act(() => {
      result.current.onQueryChange("bo");
    });

    await waitFor(() => {
      expect(searchFriends).toHaveBeenCalledWith("bo");
    });

    act(() => {
      result.current.onQueryChange("b");
    });

    await act(async () => {
      resolveSearch?.({
        results: [{ uid: "stale", username: "stale_user" }],
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.requestableResults).toEqual([]);
      expect(result.current.hasSearched).toBe(false);
    });
  });
});
