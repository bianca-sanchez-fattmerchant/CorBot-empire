import { describe, expect, it } from "vitest";
import { resolveCliModelWithSettingsFallback } from "./model-fallback.ts";

function createDb(cacheValue?: unknown) {
  return {
    prepare: () => ({
      get: () => {
        if (typeof cacheValue === "undefined") return undefined;
        return { value: JSON.stringify(cacheValue) };
      },
    }),
  } as any;
}

describe("resolveCliModelWithSettingsFallback", () => {
  it("uses settings default when no agent model is assigned", () => {
    const result = resolveCliModelWithSettingsFallback({
      db: createDb(),
      provider: "codex",
      agentModel: null,
      getProviderModelConfig: () => ({ codex: { model: "gpt-5.3-codex" } }),
    });

    expect(result.model).toBe("gpt-5.3-codex");
    expect(result.usedFallback).toBe(false);
  });

  it("falls back to settings default when assigned model is not in known provider list", () => {
    const result = resolveCliModelWithSettingsFallback({
      db: createDb({
        codex: [{ slug: "gpt-5.3-codex" }, { slug: "gpt-5.2-codex" }],
      }),
      provider: "codex",
      agentModel: "gpt-4.1",
      getProviderModelConfig: () => ({ codex: { model: "gpt-5.3-codex" } }),
    });

    expect(result.model).toBe("gpt-5.3-codex");
    expect(result.usedFallback).toBe(true);
    expect(result.reason).toContain("Falling back to settings default");
  });

  it("keeps assigned model when cache is unavailable", () => {
    const result = resolveCliModelWithSettingsFallback({
      db: createDb(),
      provider: "gemini",
      agentModel: "gemini-3-pro-preview",
      getProviderModelConfig: () => ({ gemini: { model: "gemini-2.5-pro" } }),
    });

    expect(result.model).toBe("gemini-3-pro-preview");
    expect(result.usedFallback).toBe(false);
  });
});
