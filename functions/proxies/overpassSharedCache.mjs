import { createHash, createHmac } from "node:crypto";

/** Match L1 TTL in overpassProxyCore.mjs */
const OVERPASS_L2_TTL_MS = 60 * 60 * 1000;

/** @typedef {{ kvGet: (key: string) => Promise<string | null>, kvPut: (key: string, value: string) => Promise<void>, r2Get: (key: string) => Promise<{ body: string, contentType: string } | null>, r2Put: (key: string, body: string, contentType: string) => Promise<void> }} OverpassL2Backend */

/** @type {OverpassL2Backend | null} */
let testBackend = null;

export function overpassL2CacheKey(query, tier = "free") {
  const l1Key = createHash("sha256").update(query).digest("hex");
  return `${tier}:${l1Key}`;
}

export function setOverpassL2BackendForTests(backend) {
  testBackend = backend;
}

export function createMemoryL2Backend() {
  const kv = new Map();
  const r2 = new Map();
  return {
    async kvGet(key) {
      return kv.has(key) ? kv.get(key) : null;
    },
    async kvPut(key, value) {
      kv.set(key, value);
    },
    async r2Get(key) {
      return r2.get(key) ?? null;
    },
    async r2Put(key, body, contentType) {
      r2.set(key, { body, contentType });
    },
  };
}

function envConfigured() {
  return Boolean(
    process.env.CF_ACCOUNT_ID &&
      process.env.CF_KV_NAMESPACE_ID &&
      process.env.CF_API_TOKEN &&
      process.env.CF_R2_ACCESS_KEY_ID &&
      process.env.CF_R2_SECRET_ACCESS_KEY &&
      process.env.CF_R2_BUCKET &&
      process.env.CF_R2_ENDPOINT,
  );
}

function resolveBackend() {
  if (testBackend) {
    return testBackend;
  }
  if (!envConfigured()) {
    return null;
  }
  return createCloudflareL2Backend();
}

function kvUrl(key) {
  const accountId = process.env.CF_ACCOUNT_ID;
  const namespaceId = process.env.CF_KV_NAMESPACE_ID;
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
}

function createCloudflareL2Backend() {
  const token = process.env.CF_API_TOKEN;
  return {
    async kvGet(key) {
      const response = await fetch(kvUrl(key), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`KV get failed: ${response.status}`);
      }
      return response.text();
    },
    async kvPut(key, value) {
      const response = await fetch(kvUrl(key), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "text/plain",
        },
        body: value,
      });
      if (!response.ok) {
        throw new Error(`KV put failed: ${response.status}`);
      }
    },
    async r2Get(key) {
      const signed = await signR2Request("GET", key);
      const response = await fetch(signed.url, { headers: signed.headers });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`R2 get failed: ${response.status}`);
      }
      return {
        body: await response.text(),
        contentType: response.headers.get("content-type") ?? "application/json",
      };
    },
    async r2Put(key, body, contentType) {
      const signed = await signR2Request("PUT", key, body, contentType);
      const response = await fetch(signed.url, {
        method: "PUT",
        headers: signed.headers,
        body,
      });
      if (!response.ok) {
        throw new Error(`R2 put failed: ${response.status}`);
      }
    },
  };
}

function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key, value) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

async function signR2Request(method, objectKey, body = "", contentType = "application/json") {
  const accessKeyId = process.env.CF_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.CF_R2_BUCKET;
  const endpoint = process.env.CF_R2_ENDPOINT.replace(/\/$/, "");
  const url = new URL(`${endpoint}/${bucket}/${objectKey}`);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";
  const payloadHash = sha256Hex(body);
  const canonicalHeaders =
    `host:${url.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n` +
    (method === "PUT" ? `content-type:${contentType}\n` : "");
  const signedHeaders =
    method === "PUT"
      ? "content-type;host;x-amz-content-sha256;x-amz-date"
      : "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    url.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = hmac(
    hmac(
      hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region),
      service,
    ),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  /** @type {Record<string, string>} */
  const headers = {
    Authorization: authorization,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (method === "PUT") {
    headers["Content-Type"] = contentType;
  }
  return { url: url.toString(), headers };
}

/**
 * @param {string} key
 * @param {{ allowExpired?: boolean }} [options]
 * @returns {Promise<{ text: string, stale: boolean } | null>}
 */
export async function readOverpassL2(key, options = {}) {
  const allowExpired = options.allowExpired === true;
  const backend = resolveBackend();
  if (!backend) {
    return null;
  }

  try {
    const raw = await backend.kvGet(key);
    if (!raw) {
      return null;
    }
    const meta = JSON.parse(raw);
    if (
      typeof meta?.r2Key !== "string" ||
      typeof meta?.expiresAt !== "number" ||
      typeof meta?.status !== "number"
    ) {
      return null;
    }
    if (meta.status < 200 || meta.status >= 300) {
      return null;
    }

    const expired = meta.expiresAt <= Date.now();
    if (expired && !allowExpired) {
      return null;
    }

    const object = await backend.r2Get(meta.r2Key);
    if (!object?.body) {
      return null;
    }
    return { text: object.body, stale: expired };
  } catch (error) {
    console.warn("overpass L2 read failed", error);
    return null;
  }
}

export async function writeOverpassL2(key, text, contentType = "application/json") {
  const backend = resolveBackend();
  if (!backend) {
    return;
  }
  if (typeof text !== "string" || text.length === 0) {
    return;
  }

  const r2Key = `overpass/${key}`;
  const meta = {
    r2Key,
    expiresAt: Date.now() + OVERPASS_L2_TTL_MS,
    contentType,
    byteLength: Buffer.byteLength(text, "utf8"),
    status: 200,
  };

  try {
    await backend.r2Put(r2Key, text, contentType);
    await backend.kvPut(key, JSON.stringify(meta));
  } catch (error) {
    console.warn("overpass L2 write failed", error);
  }
}
