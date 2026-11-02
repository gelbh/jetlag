import { describe, expect, it, vi } from "vitest";
import { handleFirebaseAuthProxyRequest, shouldHandleFirebaseAuthProxy } from "./firebaseAuthProxy";

function captureFetch(response: Response) {
  return vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response);
}

describe("firebaseAuthProxy", () => {
  it("matches only the /__/auth/ prefix", () => {
    expect(shouldHandleFirebaseAuthProxy("/__/auth/handler")).toBe(true);
    expect(shouldHandleFirebaseAuthProxy("/__/auth/iframe.js")).toBe(true);
    expect(shouldHandleFirebaseAuthProxy("/__/authx")).toBe(false);
    expect(shouldHandleFirebaseAuthProxy("/__/firebase/init.json")).toBe(false);
    expect(shouldHandleFirebaseAuthProxy("/ph/e/")).toBe(false);
  });

  it("forwards path and query to the Firebase auth host and passes redirects back", async () => {
    const fetchImpl = captureFetch(
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
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://accounts.google.com/o/oauth2/auth");
  });

  it("forwards only allowlisted request headers", async () => {
    const fetchImpl = captureFetch(new Response("ok"));

    await handleFirebaseAuthProxyRequest(
      new Request("https://jetlag.gelbhart.dev/__/auth/iframe", {
        headers: {
          Accept: "text/html",
          "Accept-Language": "en-IE",
          "User-Agent": "Mobile Safari",
          Cookie: "session=abc",
          Authorization: "Bearer secret",
          "CF-Connecting-IP": "203.0.113.7",
          "X-Forwarded-For": "203.0.113.7",
        },
      }),
      fetchImpl,
    );

    const headers = new Headers(fetchImpl.mock.calls[0]?.[1]?.headers);
    expect([...headers.keys()].sort()).toEqual(["accept", "accept-language", "user-agent"]);
  });

  it("forwards a POST body", async () => {
    const fetchImpl = captureFetch(new Response("ok"));

    const response = await handleFirebaseAuthProxyRequest(
      new Request("https://jetlag.gelbhart.dev/__/auth/handler", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "state=abc&code=xyz",
      }),
      fetchImpl,
    );

    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("content-type")).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(await new Response(init?.body).text()).toBe("state=abc&code=xyz");
    expect(response.status).toBe(200);
  });
});
