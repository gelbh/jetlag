import { onRequest } from "firebase-functions/v2/https";
import { setCors } from "./cors.mjs";
import { normalizeTflPayload } from "./tflNormalize.mjs";

const FEEDS = {
  london: "https://api.tfl.gov.uk/vehicle/vehiclepositions",
};

export const vehicles = onRequest(async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const metro = String(req.query.metro ?? "");
  const bounds = {
    south: Number(req.query.south),
    west: Number(req.query.west),
    north: Number(req.query.north),
    east: Number(req.query.east),
  };

  if (
    !Number.isFinite(bounds.south) ||
    !Number.isFinite(bounds.west) ||
    !Number.isFinite(bounds.north) ||
    !Number.isFinite(bounds.east)
  ) {
    res.status(400).json({ error: "Missing bounding box." });
    return;
  }

  const feedUrl = FEEDS[metro];
  if (!feedUrl) {
    res.status(404).json({ error: "Unknown metro feed." });
    return;
  }

  try {
    const response = await fetch(feedUrl, { cache: "no-store" });
    if (!response.ok) {
      res.status(502).json({ error: "Upstream feed failed." });
      return;
    }

    const payload = await response.json();
    res.status(200).json(normalizeTflPayload(payload, bounds));
  } catch {
    res.status(500).json({ error: "Transit proxy failed." });
  }
});
