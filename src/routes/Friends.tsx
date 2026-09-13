import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { FriendsLegacy } from "./FriendsLegacy";
import { FriendsMantine } from "./FriendsMantine";

export function Friends() {
  if (usePlayerUiMantine()) return <FriendsMantine />;
  return <FriendsLegacy />;
}
