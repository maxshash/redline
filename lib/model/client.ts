/**
 * The model boundary. Every analysis and answer call goes through a
 * `ModelClient`, so the seams can be tested with a stub and the real client
 * can be tested with a fake `fetch`.
 *
 * Server only: the OpenRouter key is read from a non-public env var and is
 * never passed to anything that reaches the browser.
 */

export interface JsonRequest {
  /** Name of the JSON schema, as OpenRouter's `json_schema.name`. */
  name: string;
  system: string;
  user: string;
  /** A JSON schema the response must follow. Sent with `strict: true`. */
  schema: object;
}

export interface ModelClient {
  /** Resolve with the parsed JSON the model returned. The value is untrusted. */
  completeJson(request: JsonRequest): Promise<unknown>;
}

export type ModelErrorKind =
  /** The request never got a response (network failure, abort). */
  | "network"
  /** OpenRouter answered with a non-2xx status. */
  | "http"
  /** OpenRouter answered with an `error` object in the body. */
  | "provider"
  /** The response had no message content. */
  | "empty"
  /** The message content was not JSON. */
  | "not-json";

/**
 * A model call that failed. `message` is for logs, not for people: the UI maps
 * `kind` to its own copy and never shows this text.
 */
export class ModelError extends Error {
  readonly kind: ModelErrorKind;
  readonly status: number | undefined;

  constructor(kind: ModelErrorKind, message: string, options: { status?: number; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "ModelError";
    this.kind = kind;
    this.status = options.status;
  }
}

/** The model can't be called because configuration is missing. */
export class ModelConfigError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`Model is not configured: set ${missing.join(" and ")} (for example in .env.local).`);
    this.name = "ModelConfigError";
    this.missing = missing;
  }
}

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * The provider pin, set by the owner: Fireworks only, no silent fallback to a
 * provider that ignores parameters like the JSON schema.
 */
export const PROVIDER_PREFERENCES = {
  order: ["fireworks"],
  allow_fallbacks: false,
  require_parameters: true,
} as const;

export interface OpenRouterOptions {
  apiKey: string;
  /** The OpenRouter model id. Comes from configuration, never from code. */
  model: string;
  fetch?: typeof fetch;
}

export function createOpenRouterClient(options: OpenRouterOptions): ModelClient {
  const doFetch = options.fetch ?? globalThis.fetch;

  return {
    async completeJson(request) {
      const body = {
        model: options.model,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: request.name, strict: true, schema: request.schema },
        },
        provider: PROVIDER_PREFERENCES,
        reasoning: { effort: "low" },
      };

      let response: Response;
      try {
        response = await doFetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
      } catch (cause) {
        throw new ModelError("network", "Could not reach OpenRouter.", { cause });
      }

      const raw = await response.text().catch(() => "");
      const parsed = parseJson(raw);

      const providerError = errorMessageFrom(parsed);
      if (!response.ok) {
        throw new ModelError(
          "http",
          `OpenRouter returned ${response.status}${providerError ? `: ${providerError}` : ""}.`,
          { status: response.status },
        );
      }
      if (providerError !== null) {
        throw new ModelError("provider", `OpenRouter reported an error: ${providerError}`, {
          status: response.status,
        });
      }
      if (parsed === undefined) {
        throw new ModelError("not-json", "OpenRouter's response body was not JSON.", { status: response.status });
      }

      const content = messageContent(parsed);
      if (content === null || content.trim().length === 0) {
        throw new ModelError("empty", "The model returned no content.", { status: response.status });
      }

      const json = parseJson(stripCodeFence(content));
      if (json === undefined) {
        throw new ModelError("not-json", "The model's content was not JSON.", { status: response.status });
      }
      return json;
    },
  };
}

/**
 * The client the app and the smoke script use. Throws `ModelConfigError`
 * naming whichever variable is missing; the values themselves are never
 * included in any message.
 */
export function modelClientFromEnv(env: Record<string, string | undefined> = process.env): ModelClient {
  const apiKey = env.OPENROUTER_API_KEY?.trim() ?? "";
  const model = env.OPENROUTER_MODEL?.trim() ?? "";
  const missing = [
    ...(apiKey ? [] : ["OPENROUTER_API_KEY"]),
    ...(model ? [] : ["OPENROUTER_MODEL"]),
  ];
  if (missing.length > 0) throw new ModelConfigError(missing);
  return createOpenRouterClient({ apiKey, model });
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** A JSON body wrapped in a Markdown code fence, as some providers return. */
export function stripCodeFence(content: string): string {
  const match = content.trim().match(/^```[a-zA-Z0-9_-]*[ \t]*\n([\s\S]*?)\n?```$/);
  return match ? match[1] : content;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessageFrom(body: unknown): string | null {
  if (!isRecord(body) || body.error === undefined || body.error === null) return null;
  const error = body.error;
  if (typeof error === "string") return error;
  if (isRecord(error) && typeof error.message === "string") return error.message;
  return "unknown error";
}

function messageContent(body: unknown): string | null {
  if (!isRecord(body) || !Array.isArray(body.choices) || body.choices.length === 0) return null;
  const choice = body.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) return null;
  const content = choice.message.content;
  if (typeof content === "string") return content;
  // Some providers return content as an array of parts.
  if (Array.isArray(content)) {
    return content
      .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
      .join("");
  }
  return null;
}
