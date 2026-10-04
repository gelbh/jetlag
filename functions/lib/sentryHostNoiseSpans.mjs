/**
 * Expected Overpass L2 KV miss: Cloudflare KV values GET returning 404.
 * Keep 401 and non-KV Cloudflare URLs loud.
 */

/**
 * @param {unknown} span
 * @returns {Record<string, unknown>}
 */
function readSpanData(span) {
  if (!span || typeof span !== "object") {
    return {};
  }
  const data = "data" in span && span.data && typeof span.data === "object" ? span.data : {};
  return /** @type {Record<string, unknown>} */ (data);
}

/**
 * @param {unknown} span
 * @returns {string}
 */
function readHttpUrl(span) {
  const data = readSpanData(span);
  const fromData = data["http.url"] ?? data.url;
  if (typeof fromData === "string") {
    return fromData;
  }
  if (
    span &&
    typeof span === "object" &&
    "description" in span &&
    typeof span.description === "string"
  ) {
    const match = span.description.match(/https?:\/\/\S+/);
    if (match) {
      return match[0];
    }
  }
  return "";
}

/**
 * @param {unknown} span
 * @returns {number | null | undefined}
 */
function readStatusCode(span) {
  const data = readSpanData(span);
  const raw = data["http.status_code"] ?? data["http.response.status_code"];
  if (raw === null || raw === undefined) {
    return /** @type {null | undefined} */ (raw);
  }
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))) {
    return Number(raw);
  }
  return undefined;
}

/**
 * @param {unknown} span
 * @returns {boolean}
 */
export function isCloudflareKvMissSpan(span) {
  if (!span || typeof span !== "object") {
    return false;
  }
  const op = "op" in span ? span.op : undefined;
  if (op !== undefined && op !== "http.client") {
    return false;
  }
  const url = readHttpUrl(span);
  if (!url.includes("api.cloudflare.com")) {
    return false;
  }
  if (!url.includes("/storage/kv/") || !url.includes("/values/")) {
    return false;
  }
  return readStatusCode(span) === 404;
}
