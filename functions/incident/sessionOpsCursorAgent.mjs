/**
 * Session-ops support turns via Cursor Cloud Agents API (no-repo + HTTP MCP).
 *
 * Not OpenAI chat-completions. Not the hotfix repo/PR launcher.
 * Auth: CURSOR_API_KEY (Basic), same key family as launchCursorHotfix.
 */

export const CURSOR_API_DEFAULT_BASE_URL = "https://api.cursor.com";
export const SESSION_OPS_MCP_SERVER_NAME = "jetlag-session-ops";
export const SESSION_OPS_AGENT_MISCONFIGURED = "SESSION_OPS_AGENT_MISCONFIGURED";
export const SESSION_OPS_AGENT_FAILED = "SESSION_OPS_AGENT_FAILED";
export const SESSION_OPS_AGENT_BUSY = "SESSION_OPS_AGENT_BUSY";

/**
 * @param {string | undefined} apiKey
 * @param {string | undefined} baseUrl
 */
function resolveBaseUrl(baseUrl) {
  return (
    typeof baseUrl === "string" && baseUrl.trim()
      ? baseUrl.trim()
      : CURSOR_API_DEFAULT_BASE_URL
  ).replace(/\/+$/, "");
}

/**
 * @param {{
 *   apiKey?: string,
 *   promptText?: string,
 *   mcpUrl?: string,
 *   mcpAuthHeader?: string,
 * }} input
 */
function requireAgentInputs(input) {
  const apiKey = typeof input?.apiKey === "string" ? input.apiKey.trim() : "";
  if (!apiKey) {
    throw new Error(SESSION_OPS_AGENT_MISCONFIGURED);
  }
  const promptText =
    typeof input?.promptText === "string" ? input.promptText.trim() : "";
  if (!promptText) {
    throw new Error(SESSION_OPS_AGENT_FAILED);
  }
  const mcpUrl = typeof input?.mcpUrl === "string" ? input.mcpUrl.trim() : "";
  const mcpAuthHeader =
    typeof input?.mcpAuthHeader === "string" ? input.mcpAuthHeader.trim() : "";
  if (!mcpUrl || !mcpAuthHeader) {
    throw new Error(SESSION_OPS_AGENT_MISCONFIGURED);
  }
  return { apiKey, promptText, mcpUrl, mcpAuthHeader };
}

/**
 * @param {string} mcpUrl
 * @param {string} mcpAuthHeader
 */
function buildMcpServers(mcpUrl, mcpAuthHeader) {
  return [
    {
      name: SESSION_OPS_MCP_SERVER_NAME,
      type: "http",
      url: mcpUrl,
      headers: { Authorization: mcpAuthHeader },
    },
  ];
}

/**
 * @param {string} apiKey
 */
function basicAuthHeader(apiKey) {
  return `Basic ${Buffer.from(`${apiKey}:`, "utf8").toString("base64")}`;
}

/**
 * @param {Response} response
 * @param {unknown} payload
 */
function throwForFailedResponse(response, payload) {
  if (response.status === 409) {
    throw new Error(SESSION_OPS_AGENT_BUSY);
  }
  const code =
    payload && typeof payload === "object" && typeof payload.code === "string"
      ? payload.code
      : "";
  if (code === "agent_busy") {
    throw new Error(SESSION_OPS_AGENT_BUSY);
  }
  throw new Error(SESSION_OPS_AGENT_FAILED);
}

/**
 * Create a no-repo Cloud Agent and its first run.
 *
 * @param {{
 *   apiKey: string,
 *   promptText: string,
 *   mcpUrl: string,
 *   mcpAuthHeader: string,
 *   name?: string,
 *   baseUrl?: string,
 * }} input
 * @param {{ fetch?: typeof fetch }} [deps]
 * @returns {Promise<{ agentId: string, runId: string | null, agentUrl: string | null, raw: unknown }>}
 */
export async function createSessionOpsAgent(input, deps = {}) {
  const { apiKey, promptText, mcpUrl, mcpAuthHeader } = requireAgentInputs(input);
  const baseUrl = resolveBaseUrl(input.baseUrl);
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error(SESSION_OPS_AGENT_FAILED);
  }

  /** @type {Record<string, unknown>} */
  const body = {
    prompt: { text: promptText },
    mcpServers: buildMcpServers(mcpUrl, mcpAuthHeader),
    mode: "agent",
  };
  if (typeof input?.name === "string" && input.name.trim()) {
    body.name = input.name.trim().slice(0, 100);
  }

  let response;
  try {
    response = await fetchImpl(`${baseUrl}/v1/agents`, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(apiKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(SESSION_OPS_AGENT_FAILED);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throwForFailedResponse(response, payload);
  }

  const agent = payload?.agent ?? payload;
  const agentId =
    typeof agent?.id === "string"
      ? agent.id
      : typeof payload?.id === "string"
        ? payload.id
        : null;
  const agentUrl =
    typeof agent?.url === "string"
      ? agent.url
      : typeof payload?.url === "string"
        ? payload.url
        : null;
  const runId =
    typeof payload?.run?.id === "string"
      ? payload.run.id
      : typeof agent?.latestRunId === "string"
        ? agent.latestRunId
        : null;

  if (!agentId) {
    throw new Error(SESSION_OPS_AGENT_FAILED);
  }

  return { agentId, agentUrl, runId, raw: payload };
}

/**
 * Follow-up run on an existing session-ops agent.
 *
 * @param {{
 *   apiKey: string,
 *   agentId: string,
 *   promptText: string,
 *   mcpUrl: string,
 *   mcpAuthHeader: string,
 *   baseUrl?: string,
 * }} input
 * @param {{ fetch?: typeof fetch }} [deps]
 * @returns {Promise<{ runId: string, raw: unknown }>}
 */
export async function createSessionOpsRun(input, deps = {}) {
  const { apiKey, promptText, mcpUrl, mcpAuthHeader } = requireAgentInputs(input);
  const agentId = typeof input?.agentId === "string" ? input.agentId.trim() : "";
  if (!agentId) {
    throw new Error(SESSION_OPS_AGENT_MISCONFIGURED);
  }

  const baseUrl = resolveBaseUrl(input.baseUrl);
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error(SESSION_OPS_AGENT_FAILED);
  }

  const body = {
    prompt: { text: promptText },
    mcpServers: buildMcpServers(mcpUrl, mcpAuthHeader),
    mode: "agent",
  };

  let response;
  try {
    response = await fetchImpl(
      `${baseUrl}/v1/agents/${encodeURIComponent(agentId)}/runs`,
      {
        method: "POST",
        headers: {
          Authorization: basicAuthHeader(apiKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
  } catch {
    throw new Error(SESSION_OPS_AGENT_FAILED);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throwForFailedResponse(response, payload);
  }

  const runId =
    typeof payload?.run?.id === "string"
      ? payload.run.id
      : typeof payload?.id === "string"
        ? payload.id
        : null;
  if (!runId) {
    throw new Error(SESSION_OPS_AGENT_FAILED);
  }

  return { runId, raw: payload };
}

/**
 * Read run status (and terminal text when present).
 *
 * @param {{
 *   apiKey: string,
 *   agentId: string,
 *   runId: string,
 *   baseUrl?: string,
 * }} input
 * @param {{ fetch?: typeof fetch }} [deps]
 * @returns {Promise<{ status: string, text: string | null, raw: unknown }>}
 */
export async function getSessionOpsRun(input, deps = {}) {
  const apiKey = typeof input?.apiKey === "string" ? input.apiKey.trim() : "";
  const agentId = typeof input?.agentId === "string" ? input.agentId.trim() : "";
  const runId = typeof input?.runId === "string" ? input.runId.trim() : "";
  if (!apiKey || !agentId || !runId) {
    throw new Error(SESSION_OPS_AGENT_MISCONFIGURED);
  }

  const baseUrl = resolveBaseUrl(input.baseUrl);
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error(SESSION_OPS_AGENT_FAILED);
  }

  let response;
  try {
    response = await fetchImpl(
      `${baseUrl}/v1/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`,
      {
        method: "GET",
        headers: {
          Authorization: basicAuthHeader(apiKey),
        },
      },
    );
  } catch {
    throw new Error(SESSION_OPS_AGENT_FAILED);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throwForFailedResponse(response, payload);
  }

  const status =
    typeof payload?.status === "string"
      ? payload.status
      : typeof payload?.run?.status === "string"
        ? payload.run.status
        : "UNKNOWN";

  let text = null;
  if (typeof payload?.result?.text === "string" && payload.result.text.trim()) {
    text = payload.result.text.trim();
  } else if (typeof payload?.text === "string" && payload.text.trim()) {
    text = payload.text.trim();
  } else if (
    typeof payload?.summary === "string" &&
    payload.summary.trim()
  ) {
    text = payload.summary.trim();
  }

  return { status, text, raw: payload };
}
