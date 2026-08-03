import { describe, expect, it } from "vitest";
import { buildSessionInviteUrl } from "./sessionInviteUrl";

describe("buildSessionInviteUrl", () => {
  it("builds an absolute join URL with a normalized code", () => {
    expect(buildSessionInviteUrl("https://play.example.com", "abcd")).toBe(
      "https://play.example.com/join?code=ABCD",
    );
    expect(buildSessionInviteUrl("https://play.example.com/", "wxyz")).toBe(
      "https://play.example.com/join?code=WXYZ",
    );
  });

  it("returns null for invalid codes", () => {
    expect(buildSessionInviteUrl("https://play.example.com", "AB")).toBeNull();
    expect(buildSessionInviteUrl("https://play.example.com", "")).toBeNull();
    expect(buildSessionInviteUrl("https://play.example.com", "12!@")).toBeNull();
  });
});
