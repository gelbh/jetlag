import { describe, expect, it, vi } from "vitest";
import { handleFirebaseAuthProxyRequest, shouldHandleFirebaseAuthProxy } from "./firebaseAuthProxy";

describe("firebaseAuthProxy", () => {
  it("matches only the /__/auth/ prefix", () => {
    expect(shouldHandleFirebaseAuthProxy("/__/auth/handler")).toBe(true);
    expect(shouldHandleFirebaseAuthProxy("/__/auth/iframe.js")).toBe(true);
    expect(shouldHandleFirebaseAuthProxy("/__/authx")).toBe(false);
    expect(shouldHandleFirebaseAuthProxy("/__/firebase/init.json")).toBe(false);
    expect(shouldHandleFirebaseAuthProxy("/ph/e/")).toBe(false);
  });

  it("forwards path and query to the Firebase auth host and passes redirects back", async () => {
    const fetchImpl = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(null, {
          status: 302,
          headers: { Location: "https://accounts.google.com/o/oauth2/auth" },
        }),
    );

    const response = await handleFirebaseAuthProxyRequest(
      new Request("https://jetlag.gelbhart.dev/__/auth/handler?authType=signInViaRedirect"),
      fetchImpl,
    );

    const [input, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(input)).toBe(
      "https://jet-lag-map-companion.firebaseapp.com/__/auth/handler?authType=signInViaRedirect",
    );
    expect(init?.method).toBe("GET");
    expect(init?.redirect).toBe("manual");
    expect(init?.body).toBeUndefined();
    expect(new Headers(init?.headers).get("host")).toBeNull();
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://accounts.google.com/o/oauth2/auth");
  });

  it("forwards a POST body", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const forwarded = new Request(input, init);
      expect(forwarded.method).toBe("POST");
      expect(forwarded.headers.get("content-type")).toBe("application/x-www-form-urlencoded");
      expect(await forwarded.text()).toBe("state=abc&code=xyz");
      return new Response("ok");
    });

    const response = await handleFirebaseAuthProxyRequest(
      new Request("https://jetlag.gelbhart.dev/__/auth/handler", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "state=abc&code=xyz",
      }),
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
  });
});
