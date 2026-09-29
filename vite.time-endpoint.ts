import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { handleTimeRequest, TIME_ENDPOINT_PATH } from "./worker/timeEndpoint";

/**
 * Serves the Worker's `/api/time` handler from `vite dev` / `vite preview`
 * (e2e) through a thin Node → Fetch adapter, so both share one implementation.
 */
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
    const response = handleTimeRequest(
      new Request(`http://localhost${req.url}`, { method: req.method }),
    );
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    void response.arrayBuffer().then(
      (body) => {
        res.end(Buffer.from(body));
      },
      () => {
        res.end();
      },
    );
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
