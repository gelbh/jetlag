import { fetchCachedOverpassQuery } from "../overpassProxyCore.mjs";
import { parseOverpassQueryBody } from "../proxyValidation.mjs";
import { createProxyHandler } from "../createProxyHandler.mjs";
import { requireOverpassProxyAccess } from "../../handlers/proxyShared.mjs";

export const OVERPASS_MAX_RESPONSE_BYTES = 4_000_000;

export function isOverpassResponseTooLarge(text) {
  return text.length > OVERPASS_MAX_RESPONSE_BYTES;
}

export const overpassHandler = createProxyHandler({
  routeName: "overpass",
  methods: ["POST"],
  requireAccess: requireOverpassProxyAccess,
  defaultErrorMessage: "Overpass query failed.",
  handler: async (req, res, authResult) => {
    const queryResult = parseOverpassQueryBody(req.body);
    if (!queryResult.ok) {
      res.status(400).json({ error: queryResult.error });
      return;
    }

    const query = queryResult.value;
    try {
      const text = await fetchCachedOverpassQuery(query, authResult.tier);
      if (isOverpassResponseTooLarge(text)) {
        res.status(413).json({ error: "Overpass response too large." });
        return;
      }

      res.status(200).type("application/json").send(text);
    } catch (error) {
      if (error instanceof Error && error.message === "Overpass timed out.") {
        res.status(504).json({ error: "Overpass timed out." });
        return;
      }

      throw error;
    }
  },
});
