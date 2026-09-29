import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const TIME_ENDPOINT_PATH = "/api/time";

/** Mirrors worker/timeEndpoint.ts for `vite dev` / `vite preview` (e2e). */
export function timeEndpointPlugin(): Plugin {
  const handler = (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    if (req.url?.split("?")[0] !== TIME_ENDPOINT_PATH) {
      next();
      return;
    }
    const now = Date.now();
    res.setHeader("cache-control", "no-store");
    res.setHeader("x-server-time", String(now));
    if (req.method === "HEAD") {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.setHeader("allow", "GET, HEAD");
      res.end();
      return;
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ now }));
  };
  return {
    name: "jetlag-time-endpoint",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
