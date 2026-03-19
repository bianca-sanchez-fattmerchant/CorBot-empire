type ProviderModelConfig = Record<
  string,
  { model?: string; subModel?: string; reasoningLevel?: string; subModelReasoningLevel?: string }
>;

type DbLike = {
  prepare: (sql: string) => {
    get: (...args: unknown[]) => unknown;
  };
};

type ResolveCliModelWithFallbackInput = {
  db: DbLike;
  provider: string;
  agentModel?: string | null;
  getProviderModelConfig: () => ProviderModelConfig;
};

function normalizeModel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readCliModelCache(db: DbLike): Record<string, unknown> | null {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'cli_models_cache'").get() as
      | { value?: string }
      | undefined;
    if (!row?.value) return null;
    const parsed = JSON.parse(row.value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readKnownProviderModels(cache: Record<string, unknown> | null, provider: string): Set<string> {
  const out = new Set<string>();
  if (!cache) return out;
  const entries = cache[provider];
  if (!Array.isArray(entries)) return out;

  for (const entry of entries) {
    if (typeof entry === "string") {
      const normalized = normalizeModel(entry);
      if (normalized) out.add(normalized);
      continue;
    }
    if (entry && typeof entry === "object") {
      const slug = normalizeModel((entry as { slug?: unknown }).slug);
      if (slug) out.add(slug);
    }
  }

  return out;
}

export function resolveCliModelWithSettingsFallback(input: ResolveCliModelWithFallbackInput): {
  model: string | undefined;
  usedFallback: boolean;
  reason?: string;
} {
  const { db, provider, agentModel, getProviderModelConfig } = input;
  const defaultModel = normalizeModel(getProviderModelConfig()[provider]?.model) ?? undefined;
  const requestedModel = normalizeModel(agentModel) ?? undefined;

  if (!requestedModel) {
    return { model: defaultModel, usedFallback: false };
  }
  if (!defaultModel || requestedModel === defaultModel) {
    return { model: requestedModel, usedFallback: false };
  }

  const knownModels = readKnownProviderModels(readCliModelCache(db), provider);
  if (knownModels.size > 0 && !knownModels.has(requestedModel)) {
    return {
      model: defaultModel,
      usedFallback: true,
      reason: `Agent model '${requestedModel}' is unavailable for provider '${provider}'. Falling back to settings default '${defaultModel}'.`,
    };
  }

  return { model: requestedModel, usedFallback: false };
}
