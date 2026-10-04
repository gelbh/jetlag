function readSpanData(span: unknown): Record<string, unknown> {
  if (!span || typeof span !== "object") {
    return {};
  }
  const data = "data" in span && span.data && typeof span.data === "object" ? span.data : {};
  return data as Record<string, unknown>;
}

function readHttpUrl(span: unknown): string {
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

function readStatusCode(span: unknown): number | null | undefined {
  const data = readSpanData(span);
  const raw = data["http.status_code"] ?? data["http.response.status_code"];
  if (raw === null || raw === undefined) {
    return raw as null | undefined;
  }
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))) {
    return Number(raw);
  }
  return undefined;
}

/** Expected map pan/zoom abort: OpenFreeMap tile http.client with no status. */
export function isOpenFreeMapTileAbortSpan(span: unknown): boolean {
  if (!span || typeof span !== "object") {
    return false;
  }
  const op = "op" in span ? span.op : undefined;
  if (op !== undefined && op !== "http.client") {
    return false;
  }
  const url = readHttpUrl(span);
  if (!url.includes("tiles.openfreemap.org")) {
    return false;
  }
  const status = readStatusCode(span);
  return status === null || status === undefined;
}
