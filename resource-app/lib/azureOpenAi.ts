export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export async function chat(
  messages: ChatMessage[],
  opts: {
    temperature?: number;
    jsonMode?: boolean;
    maxTokens?: number;
    reasoningEffort?: "low" | "medium" | "high";
    reasoning?: Record<string, unknown>;
  } = {},
): Promise<string> {
  const endpoint = requiredEnv("AZURE_OPENAI_ENDPOINT")
    .replace(/\/+$/, "")
    .replace(/\/openai\/v1$/i, "")
    .replace(/\/openai$/i, "");
  const apiKey = requiredEnv("AZURE_OPENAI_API_KEY");
  const deployment =
    process.env.AZURE_OPENAI_DEPLOYMENT?.trim() ||
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME?.trim();
  if (!deployment) {
    throw new Error("AZURE_OPENAI_DEPLOYMENT is not set");
  }

  // Foundry / Azure OpenAI v1 API. Works with both
  // https://xxx.openai.azure.com and https://xxx.services.ai.azure.com
  const url = `${endpoint}/openai/v1/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: deployment,
      messages,
      temperature: opts.temperature ?? 0.2,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Azure OpenAI error ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/** Extract the first JSON object/array from a model response, tolerant of prose/fences. */
export function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  try {
    return JSON.parse(candidate) as T;
  } catch {
    // Fall through to bracket scanning.
  }

  const start = candidate.search(/[[{]/);
  if (start === -1) return null;
  const open = candidate[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  for (let i = start; i < candidate.length; i++) {
    if (candidate[i] === open) depth++;
    else if (candidate[i] === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(candidate.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
