import { createHash } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { OVERPASS_L2_ENV_KEYS as K, OVERPASS_L2_ENV_KEY_LIST } from "./overpassL2Env.mjs";

/** Match L1 TTL in overpassProxyCore.mjs */
const OVERPASS_L2_TTL_MS = 60 * 60 * 1000;

/** @typedef {{ kvGet: (key: string) => Promise<string | null>, kvPut: (key: string, value: string) => Promise<void>, r2Get: (key: string) => Promise<{ body: string, contentType: string } | null>, r2Put: (key: string, body: string, contentType: string) => Promise<void> }} OverpassL2Backend */

/** @typedef {{ send: (command: unknown) => Promise<unknown> }} OverpassL2S3Client */

/** @type {OverpassL2Backend | null} */
let testBackend = null;

/** @type {OverpassL2Backend | null} */
let cachedCloudflareBackend = null;

export function overpassL2CacheKey(query, tier = "free") {
  const l1Key = createHash("sha256").update(query).digest("hex");
  return `${tier}:${l1Key}`;
}

export function setOverpassL2BackendForTests(backend) {
  testBackend = backend;
  cachedCloudflareBackend = null;
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
  return OVERPASS_L2_ENV_KEY_LIST.every((key) => Boolean(process.env[key]));
}

function resolveBackend() {
  if (testBackend) {
    return testBackend;
  }
  if (!envConfigured()) {
    return null;
  }
  if (!cachedCloudflareBackend) {
    cachedCloudflareBackend = createCloudflareL2Backend();
  }
  return cachedCloudflareBackend;
}

function kvUrl(key) {
  const accountId = process.env[K.ACCOUNT_ID];
  const namespaceId = process.env[K.KV_NAMESPACE_ID];
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
}

/**
 * R2-compatible S3 client options. Checksum WHEN_REQUIRED is required for
 * `@aws-sdk/client-s3` ≥3.729 (default CRC32 FULL_OBJECT is unsupported by R2).
 * @returns {ConstructorParameters<typeof S3Client>[0]}
 */
export function createOverpassR2S3ClientConfig() {
  return {
    region: "auto",
    endpoint: process.env[K.R2_ENDPOINT],
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env[K.R2_ACCESS_KEY_ID],
      secretAccessKey: process.env[K.R2_SECRET_ACCESS_KEY],
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  };
}

function defaultCreateS3Client() {
  return new S3Client(createOverpassR2S3ClientConfig());
}

function isR2NotFound(error) {
  return error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404;
}

/**
 * @param {{ createS3Client?: () => OverpassL2S3Client }} [options]
 * @returns {OverpassL2Backend}
 */
export function createCloudflareL2Backend(options = {}) {
  const token = process.env[K.API_TOKEN];
  const bucket = process.env[K.R2_BUCKET];
  const createS3Client = options.createS3Client ?? defaultCreateS3Client;
  const client = createS3Client();

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
      const ttlSeconds = Math.max(60, Math.floor(OVERPASS_L2_TTL_MS / 1000));
      const response = await fetch(`${kvUrl(key)}?expiration_ttl=${ttlSeconds}`, {
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
      try {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
        );
        if (typeof response.Body?.transformToString !== "function") {
          throw new Error("R2 get failed: response body is not a readable stream");
        }
        return {
          body: await response.Body.transformToString(),
          contentType: response.ContentType ?? "application/json",
        };
      } catch (error) {
        if (isR2NotFound(error)) {
          return null;
        }
        throw error;
      }
    },
    async r2Put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
  };
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
