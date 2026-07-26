import { defineSecret } from "firebase-functions/params";
import { fetchTransitlandVehicles } from "../transitlandProxy.mjs";
import {
  parseBoundingBoxQuery,
  parseTransitlandFeedQuery,
} from "../proxyValidation.mjs";
import { createProxyHandler } from "../createProxyHandler.mjs";

export const transitlandApiKeySecret = defineSecret("TRANSITLAND_API_KEY");

export const transitlandHandler = createProxyHandler({
  routeName: "transitland",
  defaultErrorMessage: "Transitland proxy failed.",
  handler: async (req, res) => {
    const feedResult = parseTransitlandFeedQuery(req.query);
    if (!feedResult.ok) {
      res.status(400).json({ error: feedResult.error });
      return;
    }

    const boundsResult = parseBoundingBoxQuery(req.query);
    if (!boundsResult.ok) {
      res.status(400).json({ error: boundsResult.error });
      return;
    }

    const feed = feedResult.value;
    const bounds = boundsResult.value;

    const apiKey = transitlandApiKeySecret.value();
    if (!apiKey) {
      res.status(503).json({ error: "Transitland proxy is not configured." });
      return;
    }

    const vehicleList = await fetchTransitlandVehicles(feed, apiKey, bounds);
    res.status(200).json(vehicleList);
  },
});
