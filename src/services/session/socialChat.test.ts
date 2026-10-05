import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendSocialMessage } from "./socialChat";

const postSocialMessage = vi.hoisted(() => vi.fn());
const commitWrite = vi.hoisted(() =>
  vi.fn((_label: string, run: () => Promise<void>) => ({ acknowledged: run() })),
);

vi.mock("@/services/firestore/firestoreSessionExtras", () => ({ postSocialMessage }));
vi.mock("@/services/firestore/commitWrite", () => ({ commitWrite }));

describe("sendSocialMessage", () => {
  beforeEach(() => {
    postSocialMessage.mockReset();
    postSocialMessage.mockResolvedValue(undefined);
    commitWrite.mockClear();
  });

  it("writes through commitWrite under the chat.send label with the minted id", async () => {
    const { messageId, acknowledged } = sendSocialMessage("sess-1", "seeker-1", "seeker", "hi");

    await acknowledged;
    expect(commitWrite).toHaveBeenCalledTimes(1);
    expect(commitWrite).toHaveBeenCalledWith("chat.send", expect.any(Function));
    expect(postSocialMessage).toHaveBeenCalledTimes(1);
    expect(postSocialMessage).toHaveBeenCalledWith("sess-1", "seeker-1", "seeker", "hi", messageId);
  });

  it("mints a fresh id per call so two sends are two messages", () => {
    const first = sendSocialMessage("sess-1", "seeker-1", "seeker", "hi");
    const second = sendSocialMessage("sess-1", "seeker-1", "seeker", "hi");

    expect(first.messageId).toEqual(expect.any(String));
    expect(first.messageId).not.toBe(second.messageId);
  });
});
