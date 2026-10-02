/**
 * Test-only OpenAI chat-completions helpers (retired production transport).
 * Do not import from Functions handlers.
 */

import { assembleChatMessages } from "../../incident/sessionOpsLlm.mjs";
import {
  SESSION_OPS_TOOL_IDS,
  SESSION_OPS_TOOL_JSON_SCHEMAS,
  SESSION_OPS_TOOLS,
} from "../../incident/sessionOpsTools.mjs";

export const SESSION_OPS_LLM_DEFAULT_BASE_URL = "https://api.openai.com/v1";
export const SESSION_OPS_LLM_DEFAULT_MODEL = "gpt-4o-mini";
export const SESSION_OPS_LLM_FAILED = "SESSION_OPS_LLM_FAILED";

/**
 * @param allowlist {readonly string[] | undefined}
 */
export function buildSessionOpsOpenAiTools(allowlist = SESSION_OPS_TOOL_IDS) {
  const ids = Array.isArray(allowlist) ? allowlist : SESSION_OPS_TOOL_IDS;
  return ids
    .filter((id) => typeof id === "string" && SESSION_OPS_TOOLS[id])
    .map((id) => ({
      type: "function",
      function: {
        name: id,
        description: SESSION_OPS_TOOLS[id].description,
        parameters: SESSION_OPS_TOOL_JSON_SCHEMAS[id] ?? {
          type: "object",
          properties: {},
        },
      },
    }));
}

/**
 * @param body {unknown}
 */
export function parseChatCompletion(body) {
  const choice =
    body && typeof body === "object" && Array.isArray(body.choices) && body.choices.length > 0
      ? body.choices[0]
      : null;
  const message = choice && typeof choice === "object" && choice.message ? choice.message : null;

  if (!message || typeof message !== "object") {
    return { content: null, toolCalls: [], rawMessage: null };
  }

  const content =
    typeof message.content === "string" && message.content.trim() ? message.content.trim() : null;

  /** @type {Array<{ id: string, name: string, args: Record<string, unknown> }>} */
  const toolCalls = [];
  const rawCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
  for (const call of rawCalls) {
    if (!call || typeof call !== "object") {
      continue;
    }
    const fn = call.function;
    if (!fn || typeof fn !== "object") {
      continue;
    }
    const name = typeof fn.name === "string" ? fn.name : "";
    if (!name) {
      continue;
    }
    let args = {};
    if (typeof fn.arguments === "string" && fn.arguments.trim()) {
      try {
        const parsed = JSON.parse(fn.arguments);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          args = parsed;
        }
      } catch {
        args = {};
      }
    } else if (fn.arguments && typeof fn.arguments === "object" && !Array.isArray(fn.arguments)) {
      args = fn.arguments;
    }
    toolCalls.push({
      id: typeof call.id === "string" ? call.id : `call_${toolCalls.length + 1}`,
      name,
      args,
    });
  }

  return {
    content,
    toolCalls,
    rawMessage: message,
  };
}

/**
 * @param input
 * @param deps {{ fetch?: typeof fetch }}
 */
export async function callSessionOpsLlm(input, deps = {}) {
  const apiKey = typeof input?.apiKey === "string" ? input.apiKey : "";
  if (!apiKey) {
    throw new Error(SESSION_OPS_LLM_FAILED);
  }

  const fetchImpl = deps.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error(SESSION_OPS_LLM_FAILED);
  }

  const baseUrl = (
    typeof input.baseUrl === "string" && input.baseUrl.trim()
      ? input.baseUrl.trim()
      : SESSION_OPS_LLM_DEFAULT_BASE_URL
  ).replace(/\/+$/, "");
  const model =
    typeof input.model === "string" && input.model.trim()
      ? input.model.trim()
      : SESSION_OPS_LLM_DEFAULT_MODEL;

  const messages = assembleChatMessages(input.policyMessages, input.dataMessages);
  const tools = input.tools ?? buildSessionOpsOpenAiTools(SESSION_OPS_TOOL_IDS);

  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools,
      tool_choice: "auto",
      temperature: typeof input.temperature === "number" ? input.temperature : 0.2,
    }),
  });

  if (!response?.ok) {
    throw new Error(SESSION_OPS_LLM_FAILED);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(SESSION_OPS_LLM_FAILED);
  }

  return parseChatCompletion(body);
}
