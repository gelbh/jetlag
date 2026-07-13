import {
  handleSentryTunnelRequest,
  SENTRY_TUNNEL_PATH,
} from "./sentryTunnel";

export function isSpaFallbackForAssetRequest(
  request: Request,
  response: Response,
): boolean {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/assets/")) {
    return false;
  }

  if (response.status !== 200) {
    return false;
  }

  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("text/html");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (pathname === SENTRY_TUNNEL_PATH) {
      return handleSentryTunnelRequest(request);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (isSpaFallbackForAssetRequest(request, assetResponse)) {
      return new Response("Not Found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
          "Cache-Control": "no-store",
        },
      });
    }

    return assetResponse;
  },
} satisfies ExportedHandler<Env>;

export {
  handleSentryTunnelRequest,
  parseSentryEnvelopeTarget,
  SENTRY_TUNNEL_PATH,
} from "./sentryTunnel";
