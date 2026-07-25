import { describe, expect, it, vi } from "vitest";
import { handleIncidentEmailRequest } from "./incidentEmail";

const env = {
  INCIDENT_EMAIL_SECRET: "s3cret",
  RESEND_API_KEY: "re_test",
  INCIDENT_ADMIN_EMAIL: "admin@example.com",
  INCIDENT_EMAIL_FROM: "Jet Lag <incidents@example.com>",
} as Env;

function emailRequest(
  body: unknown,
  { method = "POST", secret = "s3cret" }: { method?: string; secret?: string | null } = {},
): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret !== null) {
    headers.Authorization = `Bearer ${secret}`;
  }
  return new Request("https://jetlag.gelbhart.dev/api/incident-email", {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}

describe("handleIncidentEmailRequest", () => {
  it("rejects non-POST methods", async () => {
    const fetchImpl = vi.fn();
    const response = await handleIncidentEmailRequest(
      emailRequest(null, { method: "GET" }),
      env,
      fetchImpl,
    );
    expect(response.status).toBe(405);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects requests without the shared secret", async () => {
    const fetchImpl = vi.fn();
    const response = await handleIncidentEmailRequest(
      emailRequest({ subject: "x", text: "y" }, { secret: null }),
      env,
      fetchImpl,
    );
    expect(response.status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects requests with a wrong secret", async () => {
    const fetchImpl = vi.fn();
    const response = await handleIncidentEmailRequest(
      emailRequest({ subject: "x", text: "y" }, { secret: "nope" }),
      env,
      fetchImpl,
    );
    expect(response.status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a body missing subject or text", async () => {
    const fetchImpl = vi.fn();
    const response = await handleIncidentEmailRequest(
      emailRequest({ subject: "only subject" }),
      env,
      fetchImpl,
    );
    expect(response.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends via Resend and returns the message id", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ id: "email-123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await handleIncidentEmailRequest(
      emailRequest({ subject: "Incident", text: "diagnostics", incidentUrl: "u" }),
      env,
      fetchImpl,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "email-123" });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init as RequestInit).method).toBe("POST");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer re_test");
    const sent = JSON.parse((init as RequestInit).body as string);
    expect(sent.to).toEqual(["admin@example.com"]);
    expect(sent.from).toBe("Jet Lag <incidents@example.com>");
    expect(sent.subject).toBe("Incident");
  });

  it("defaults the recipient to the request `to` when provided", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ id: "email-9" }), { status: 200 }),
    );
    await handleIncidentEmailRequest(
      emailRequest({ subject: "s", text: "t", to: "other@example.com" }),
      env,
      fetchImpl,
    );
    const sent = JSON.parse(
      (fetchImpl.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(sent.to).toEqual(["other@example.com"]);
  });

  it("returns 502 when Resend rejects the request", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("bad", { status: 422 }),
    );
    const response = await handleIncidentEmailRequest(
      emailRequest({ subject: "s", text: "t" }),
      env,
      fetchImpl,
    );
    expect(response.status).toBe(502);
  });

  it("returns 500 when the secret is not configured", async () => {
    const fetchImpl = vi.fn();
    const response = await handleIncidentEmailRequest(
      emailRequest({ subject: "s", text: "t" }),
      { RESEND_API_KEY: "re_test" } as Env,
      fetchImpl,
    );
    expect(response.status).toBe(500);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
