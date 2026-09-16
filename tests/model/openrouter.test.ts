import { describe, expect, it } from "vitest";
import {
  ModelConfigError,
  ModelError,
  OPENROUTER_URL,
  createOpenRouterClient,
  modelClientFromEnv,
  type JsonRequest,
} from "@/lib/model/client";

const request: JsonRequest = {
  name: "test_schema",
  system: "system text",
  user: "user text",
  schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false },
};

interface Call {
  url: string;
  init: RequestInit;
}

/** A fake fetch that records calls and answers with a fixed response. */
function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return respond();
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

function completion(content: unknown, status = 200): Response {
  return new Response(JSON.stringify({ id: "gen-1", choices: [{ message: { role: "assistant", content } }] }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function client(respond: () => Response | Promise<Response>) {
  const fake = fakeFetch(respond);
  return { model: createOpenRouterClient({ apiKey: "sk-test-key", model: "test/model", fetch: fake.fetch }), calls: fake.calls };
}

async function failure(promise: Promise<unknown>): Promise<ModelError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ModelError);
  return error as ModelError;
}

describe("createOpenRouterClient request", () => {
  it("posts the pinned provider, low reasoning effort and a strict JSON schema", async () => {
    const { model, calls } = client(() => completion('{"ok":true}'));
    expect(await model.completeJson(request)).toEqual({ ok: true });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(OPENROUTER_URL);
    expect(OPENROUTER_URL).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(calls[0].init.method).toBe("POST");

    const body = JSON.parse(String(calls[0].init.body));
    expect(body).toEqual({
      model: "test/model",
      messages: [
        { role: "system", content: "system text" },
        { role: "user", content: "user text" },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "test_schema", strict: true, schema: request.schema },
      },
      provider: { order: ["fireworks"], allow_fallbacks: false, require_parameters: true },
      reasoning: { effort: "low" },
    });
  });

  it("authenticates with the API key as a bearer token", async () => {
    const { model, calls } = client(() => completion('{"ok":true}'));
    await model.completeJson(request);
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get("Authorization")).toBe("Bearer sk-test-key");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("uses the model it was configured with", async () => {
    const fake = fakeFetch(() => completion('{"ok":true}'));
    await createOpenRouterClient({ apiKey: "k", model: "another/fake-model", fetch: fake.fetch }).completeJson(request);
    expect(JSON.parse(String(fake.calls[0].init.body)).model).toBe("another/fake-model");
  });
});

describe("createOpenRouterClient response handling", () => {
  it("accepts JSON wrapped in a code fence", async () => {
    const { model } = client(() => completion('```json\n{"ok": true}\n```'));
    expect(await model.completeJson(request)).toEqual({ ok: true });
    const bare = client(() => completion('```\n{"ok": false}\n```'));
    expect(await bare.model.completeJson(request)).toEqual({ ok: false });
  });

  it("reports a non-2xx response as an http error", async () => {
    const { model } = client(() => new Response(JSON.stringify({ error: { message: "No auth", code: 401 } }), { status: 401 }));
    const error = await failure(model.completeJson(request));
    expect(error.kind).toBe("http");
    expect(error.status).toBe(401);
  });

  it("reports a non-2xx response with a non-JSON body as an http error", async () => {
    const { model } = client(() => new Response("<html>Bad gateway</html>", { status: 502 }));
    expect((await failure(model.completeJson(request))).kind).toBe("http");
  });

  it("reports an error object in a 200 body as a provider error", async () => {
    const { model } = client(
      () => new Response(JSON.stringify({ error: { message: "No endpoints found that support json_schema", code: 404 } }), { status: 200 }),
    );
    const error = await failure(model.completeJson(request));
    expect(error.kind).toBe("provider");
    expect(error.message).toContain("No endpoints found");
  });

  it("reports empty content", async () => {
    expect((await failure(client(() => completion("")).model.completeJson(request))).kind).toBe("empty");
    expect((await failure(client(() => completion(null)).model.completeJson(request))).kind).toBe("empty");
    const noChoices = client(() => new Response(JSON.stringify({ choices: [] }), { status: 200 }));
    expect((await failure(noChoices.model.completeJson(request))).kind).toBe("empty");
  });

  it("reports content that isn't JSON", async () => {
    const { model } = client(() => completion("Here is the analysis you asked for."));
    expect((await failure(model.completeJson(request))).kind).toBe("not-json");
  });

  it("reports a 200 body that isn't JSON", async () => {
    const { model } = client(() => new Response("not json", { status: 200 }));
    expect((await failure(model.completeJson(request))).kind).toBe("not-json");
  });

  it("reports a failed fetch as a network error", async () => {
    const { model } = client(() => {
      throw new TypeError("fetch failed");
    });
    expect((await failure(model.completeJson(request))).kind).toBe("network");
  });

  it("never puts the API key in an error message", async () => {
    const { model } = client(() => new Response("{}", { status: 500 }));
    const error = await failure(model.completeJson(request));
    expect(error.message).not.toContain("sk-test-key");
  });
});

describe("modelClientFromEnv", () => {
  it("names both variables when both are missing", () => {
    expect(() => modelClientFromEnv({})).toThrow(ModelConfigError);
    try {
      modelClientFromEnv({});
    } catch (error) {
      expect((error as ModelConfigError).missing).toEqual(["OPENROUTER_API_KEY", "OPENROUTER_MODEL"]);
      expect((error as Error).message).toContain("OPENROUTER_API_KEY");
      expect((error as Error).message).toContain("OPENROUTER_MODEL");
    }
  });

  it("names the one variable that is missing or blank, without echoing the other", () => {
    try {
      modelClientFromEnv({ OPENROUTER_API_KEY: "sk-secret-value", OPENROUTER_MODEL: "  " });
      expect.unreachable();
    } catch (error) {
      expect((error as ModelConfigError).missing).toEqual(["OPENROUTER_MODEL"]);
      expect((error as Error).message).not.toContain("sk-secret-value");
    }
    expect(() => modelClientFromEnv({ OPENROUTER_MODEL: "test/model" })).toThrow(/OPENROUTER_API_KEY/);
  });

  it("builds a client when both are set", () => {
    expect(typeof modelClientFromEnv({ OPENROUTER_API_KEY: "k", OPENROUTER_MODEL: "test/model" }).completeJson).toBe("function");
  });
});
