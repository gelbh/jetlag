import { describe, expect, it } from "vitest";
import {
  buildSessionInviteUrl,
  parseSessionInviteCode,
  resolveSessionInviteOrigin,
} from "./sessionInviteUrl";

describe("parseSessionInviteCode", () => {
  it("normalizes valid codes and rejects invalid ones", () => {
    expect(parseSessionInviteCode("abcd")).toBe("ABCD");
    expect(parseSessionInviteCode("WXYZ")).toBe("WXYZ");
    expect(parseSessionInviteCode("ab")).toBeNull();
    expect(parseSessionInviteCode("ABCDE")).toBeNull();
    expect(parseSessionInviteCode(null)).toBeNull();
  });
});

describe("resolveSessionInviteOrigin", () => {
  const publicOrigin = "https://jetlag.gelbhart.dev";

  it("keeps public https origins", () => {
    expect(
      resolveSessionInviteOrigin("https://play.example.com", publicOrigin),
    ).toBe("https://play.example.com");
  });

  it("falls back for localhost and non-http schemes", () => {
    expect(
      resolveSessionInviteOrigin("https://localhost", publicOrigin),
    ).toBe(publicOrigin);
    expect(
      resolveSessionInviteOrigin("http://127.0.0.1:5173", publicOrigin),
    ).toBe(publicOrigin);
    expect(
      resolveSessionInviteOrigin("http://127.0.0.2:5173", publicOrigin),
    ).toBe(publicOrigin);
    expect(
      resolveSessionInviteOrigin("http://0.0.0.0:5173", publicOrigin),
    ).toBe(publicOrigin);
    expect(
      resolveSessionInviteOrigin("https://[::1]", publicOrigin),
    ).toBe(publicOrigin);
    expect(
      resolveSessionInviteOrigin("capacitor://localhost", publicOrigin),
    ).toBe(publicOrigin);
    expect(resolveSessionInviteOrigin("not a url", publicOrigin)).toBe(
      publicOrigin,
    );
  });
});

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
