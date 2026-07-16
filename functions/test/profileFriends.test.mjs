import test from "node:test";
import assert from "node:assert/strict";
import {
  FRIENDS_INVALID,
  FRIENDS_SELF,
  profileFriendsHandler,
} from "../profile/profileFriends.mjs";

test("profileFriendsHandler rejects unknown action", async () => {
  await assert.rejects(
    () =>
      profileFriendsHandler(
        {},
        { uid: "u1", token: { firebase: { sign_in_provider: "google.com" } } },
        { action: "nope" },
      ),
    (error) => error.code === FRIENDS_INVALID,
  );
});

test("profileFriendsHandler rejects self-request", async () => {
  const db = {
    collection() {
      return {
        doc() {
          return {
            collection() {
              return {
                doc() {
                  return {
                    async get() {
                      return {
                        data: () => ({ username: "me" }),
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  await assert.rejects(
    () =>
      profileFriendsHandler(
        db,
        { uid: "u1", token: { firebase: { sign_in_provider: "google.com" } } },
        { action: "request", toUid: "u1" },
      ),
    (error) => error.code === FRIENDS_SELF,
  );
});
