import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import JSZip from "jszip";
import type { RuntimeContext } from "../../../types/runtime-context.ts";

const ROLE_VALUES = new Set(["team_leader", "senior", "junior", "intern"]);
const PROVIDER_VALUES = new Set(["claude", "codex", "gemini", "opencode", "kimi", "copilot", "antigravity", "api"]);
const CONFLICT_VALUES = new Set(["skip", "update", "error"]);
const MATCH_VALUES = new Set(["name"]);
const CUSTOM_SKILL_NAME_RE = /^[A-Za-z0-9_-]{1,80}$/;

interface BundleAgent {
  external_key?: string;
  name: string;
  name_ko?: string;
  name_ja?: string;
  name_zh?: string;
  department_id?: string | null;
  role?: string;
  cli_provider?: string;
  avatar_emoji?: string;
  sprite_number?: number | null;
  personality?: string | null;
}

interface BundleInstruction {
  agent_external_key?: string;
  agent_name?: string;
  content: string;
}

interface BundleSkill {
  skillName: string;
  content: string;
  providers?: string[];
}

interface AgentBundle {
  bundle_version: string;
  exported_at: number;
  source?: {
    app?: string;
    version?: string;
  };
  agents: BundleAgent[];
  instructions?: BundleInstruction[];
  skills?: BundleSkill[];
}

interface ImportOptions {
  conflict_policy: "skip" | "update" | "error";
  match_by: "name";
  include_instructions: boolean;
  include_skills: boolean;
}

interface PreviewError {
  type: "agent" | "instruction" | "skill" | "bundle";
  target?: string;
  message: string;
}

type BundleTransportFormat = "json" | "zip";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeInstructionContent(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized || normalized.length > 65535) return null;
  return normalized;
}

function parseConflictPolicy(value: unknown): ImportOptions["conflict_policy"] {
  const raw = normalizeText(value).toLowerCase();
  if (CONFLICT_VALUES.has(raw)) return raw as ImportOptions["conflict_policy"];
  return "skip";
}

function parseMatchBy(value: unknown): ImportOptions["match_by"] {
  const raw = normalizeText(value).toLowerCase();
  if (MATCH_VALUES.has(raw)) return raw as ImportOptions["match_by"];
  return "name";
}

function parseImportOptions(input: unknown): ImportOptions {
  const body = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    conflict_policy: parseConflictPolicy(body.conflict_policy),
    match_by: parseMatchBy(body.match_by),
    include_instructions: body.include_instructions !== false,
    include_skills: body.include_skills !== false,
  };
}

function parseBundleTransportFormat(value: unknown): BundleTransportFormat {
  const raw = normalizeText(value).toLowerCase();
  return raw === "zip" ? "zip" : "json";
}

function parseBundle(input: unknown): { bundle: AgentBundle | null; errors: PreviewError[] } {
  const errors: PreviewError[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      bundle: null,
      errors: [{ type: "bundle", message: "bundle must be an object" }],
    };
  }

  const raw = input as Record<string, unknown>;
  const bundleVersion = normalizeText(raw.bundle_version);
  const exportedAt = Number(raw.exported_at);
  const agents = Array.isArray(raw.agents) ? raw.agents : [];
  const instructions = Array.isArray(raw.instructions) ? raw.instructions : [];
  const skills = Array.isArray(raw.skills) ? raw.skills : [];

  if (!bundleVersion) {
    errors.push({ type: "bundle", message: "bundle_version is required" });
  }
  if (!Number.isFinite(exportedAt) || exportedAt <= 0) {
    errors.push({ type: "bundle", message: "exported_at must be a unix-ms timestamp" });
  }
  if (!Array.isArray(raw.agents)) {
    errors.push({ type: "bundle", message: "agents must be an array" });
  }
  if (agents.length > 500) {
    errors.push({ type: "bundle", message: "agents max length is 500" });
  }

  const parsedAgents: BundleAgent[] = [];
  const seenExternalKeys = new Set<string>();
  const seenAgentNames = new Set<string>();

  agents.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push({ type: "agent", target: `index:${index}`, message: "agent entry must be an object" });
      return;
    }
    const row = entry as Record<string, unknown>;
    const name = normalizeText(row.name);
    const roleRaw = normalizeText(row.role).toLowerCase();
    const providerRaw = normalizeText(row.cli_provider).toLowerCase();
    const externalKey = normalizeText(row.external_key);

    if (!name) {
      errors.push({ type: "agent", target: `index:${index}`, message: "name is required" });
      return;
    }
    const nameKey = name.toLowerCase();
    if (seenAgentNames.has(nameKey)) {
      errors.push({ type: "agent", target: name, message: "duplicate agent name in bundle" });
      return;
    }
    seenAgentNames.add(nameKey);

    if (externalKey) {
      const extKey = externalKey.toLowerCase();
      if (seenExternalKeys.has(extKey)) {
        errors.push({ type: "agent", target: name, message: "duplicate external_key in bundle" });
        return;
      }
      seenExternalKeys.add(extKey);
    }

    if (roleRaw && !ROLE_VALUES.has(roleRaw)) {
      errors.push({ type: "agent", target: name, message: `invalid role: ${roleRaw}` });
      return;
    }
    if (providerRaw && !PROVIDER_VALUES.has(providerRaw)) {
      errors.push({ type: "agent", target: name, message: `invalid cli_provider: ${providerRaw}` });
      return;
    }

    const spriteRaw = row.sprite_number;
    const spriteNumber =
      typeof spriteRaw === "number" && Number.isFinite(spriteRaw) && spriteRaw > 0 ? Math.floor(spriteRaw) : null;

    parsedAgents.push({
      external_key: externalKey || undefined,
      name,
      name_ko: normalizeText(row.name_ko) || undefined,
      name_ja: normalizeText(row.name_ja) || undefined,
      name_zh: normalizeText(row.name_zh) || undefined,
      department_id: normalizeNullableText(row.department_id),
      role: roleRaw || undefined,
      cli_provider: providerRaw || undefined,
      avatar_emoji: normalizeText(row.avatar_emoji) || undefined,
      sprite_number: spriteNumber,
      personality: normalizeNullableText(row.personality),
    });
  });

  const parsedInstructions: BundleInstruction[] = [];
  instructions.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push({ type: "instruction", target: `index:${index}`, message: "instruction entry must be an object" });
      return;
    }
    const row = entry as Record<string, unknown>;
    const content = normalizeInstructionContent(row.content);
    const agentExternalKey = normalizeText(row.agent_external_key);
    const agentName = normalizeText(row.agent_name);

    if (!content) {
      errors.push({ type: "instruction", target: `index:${index}`, message: "content is required" });
      return;
    }
    if (!agentExternalKey && !agentName) {
      errors.push({
        type: "instruction",
        target: `index:${index}`,
        message: "agent_external_key or agent_name is required",
      });
      return;
    }

    parsedInstructions.push({
      agent_external_key: agentExternalKey || undefined,
      agent_name: agentName || undefined,
      content,
    });
  });

  const parsedSkills: BundleSkill[] = [];
  skills.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push({ type: "skill", target: `index:${index}`, message: "skill entry must be an object" });
      return;
    }
    const row = entry as Record<string, unknown>;
    const skillName = normalizeText(row.skillName);
    const content = normalizeText(row.content);
    if (!skillName || !CUSTOM_SKILL_NAME_RE.test(skillName)) {
      errors.push({ type: "skill", target: `index:${index}`, message: "invalid skillName format" });
      return;
    }
    if (!content) {
      errors.push({ type: "skill", target: skillName, message: "content is required" });
      return;
    }
    if (content.length > 512_000) {
      errors.push({ type: "skill", target: skillName, message: "content too large (max 512KB)" });
      return;
    }
    const providers = Array.isArray(row.providers)
      ? row.providers
          .map((value) => normalizeText(value))
          .filter((value) => value.length > 0)
      : [];
    parsedSkills.push({ skillName, content, providers });
  });

  if (errors.length > 0) {
    return { bundle: null, errors };
  }

  return {
    bundle: {
      bundle_version: bundleVersion,
      exported_at: exportedAt,
      source:
        raw.source && typeof raw.source === "object" && !Array.isArray(raw.source)
          ? {
              app: normalizeText((raw.source as Record<string, unknown>).app) || undefined,
              version: normalizeText((raw.source as Record<string, unknown>).version) || undefined,
            }
          : undefined,
      agents: parsedAgents,
      instructions: parsedInstructions,
      skills: parsedSkills,
    },
    errors,
  };
}

async function parseBundlePayload(payload: unknown): Promise<{
  bundle: AgentBundle | null;
  errors: PreviewError[];
  format: BundleTransportFormat;
}> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      bundle: null,
      errors: [{ type: "bundle", message: "request body must be an object" }],
      format: "json",
    };
  }

  const body = payload as Record<string, unknown>;
  const format = parseBundleTransportFormat(body.format);

  if (body.bundle) {
    const parsed = parseBundle(body.bundle);
    return { ...parsed, format };
  }

  const archiveBase64 = normalizeText(body.archive_base64);
  if (!archiveBase64) {
    return {
      bundle: null,
      errors: [{ type: "bundle", message: "bundle or archive_base64 is required" }],
      format,
    };
  }

  const normalizedBase64 = archiveBase64.replace(/^data:[^;]+;base64,/, "");

  if (format !== "zip") {
    return {
      bundle: null,
      errors: [{ type: "bundle", message: "archive_base64 currently supports format=zip only" }],
      format,
    };
  }

  try {
    const zipBuffer = Buffer.from(normalizedBase64, "base64");
    const zip = await JSZip.loadAsync(zipBuffer);
    const explicitEntry = zip.file("bundle.json") ?? zip.file("agent-bundle.json") ?? null;
    const fallbackEntry = explicitEntry ?? Object.values(zip.files).find((entry) => !entry.dir && entry.name.endsWith(".json")) ?? null;

    if (!fallbackEntry) {
      return {
        bundle: null,
        errors: [{ type: "bundle", message: "zip must include bundle.json (or another json manifest)" }],
        format,
      };
    }

    const jsonText = await fallbackEntry.async("string");
    const parsedJson = JSON.parse(jsonText) as unknown;
    const parsedBundle = parseBundle(parsedJson);
    return { ...parsedBundle, format };
  } catch {
    return {
      bundle: null,
      errors: [{ type: "bundle", message: "failed to decode zip bundle payload" }],
      format,
    };
  }
}

async function encodeBundleAsZip(bundle: AgentBundle): Promise<string> {
  const zip = new JSZip();
  zip.file("bundle.json", JSON.stringify(bundle, null, 2));
  zip.file(
    "README.txt",
    [
      "CorBot-Empire Agent Bundle",
      "",
      "Files:",
      "- bundle.json : bundle manifest and data",
    ].join("\n"),
  );
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
  return zipBuffer.toString("base64");
}

function resolveCustomSkillDirectory(customSkillsDir: string, skillName: string): { dirPath: string } | null {
  const canonical = skillName.toLowerCase();
  const directPath = path.join(customSkillsDir, canonical);
  if (fs.existsSync(directPath)) return { dirPath: directPath };
  if (!fs.existsSync(customSkillsDir)) return null;
  const entries = fs.readdirSync(customSkillsDir, { withFileTypes: true });
  const found = entries.find((entry) => entry.isDirectory() && entry.name.toLowerCase() === canonical);
  if (!found) return null;
  return { dirPath: path.join(customSkillsDir, found.name) };
}

export function registerAgentBundleRoutes(
  ctx: RuntimeContext,
  deps: { normalizeSkillLearnProviders: (input: unknown) => string[] },
): void {
  const { app, db, logsDir, nowMs } = ctx;
  const { normalizeSkillLearnProviders } = deps;

  function departmentExists(departmentId: string): boolean {
    const inDepartments = db.prepare("SELECT id FROM departments WHERE id = ? LIMIT 1").get(departmentId) as
      | { id?: unknown }
      | undefined;
    if (inDepartments) return true;
    const inPack = db
      .prepare("SELECT department_id FROM office_pack_departments WHERE department_id = ? LIMIT 1")
      .get(departmentId) as { department_id?: unknown } | undefined;
    return Boolean(inPack);
  }

  function findAgentByName(name: string): { id: string } | null {
    const row = db.prepare("SELECT id FROM agents WHERE lower(name) = lower(?) LIMIT 1").get(name) as
      | { id?: unknown }
      | undefined;
    const id = normalizeText(row?.id);
    return id ? { id } : null;
  }

  function collectPreview(bundle: AgentBundle, options: ImportOptions): {
    preview: {
      agent_actions: Array<{ name: string; action: "create" | "update" | "skip" | "error"; reason?: string }>;
      instruction_actions: Array<{ target: string; action: "create" | "update" | "skip" | "error"; reason?: string }>;
      skill_actions: Array<{ skillName: string; action: "create" | "update" | "skip" | "error"; reason?: string }>;
    };
    errors: PreviewError[];
  } {
    const errors: PreviewError[] = [];

    const agentActions = bundle.agents.map((agent) => {
      if (agent.department_id && !departmentExists(agent.department_id)) {
        const reason = `department not found: ${agent.department_id}`;
        errors.push({ type: "agent", target: agent.name, message: reason });
        return { name: agent.name, action: "error" as const, reason };
      }
      const existing = findAgentByName(agent.name);
      if (!existing) return { name: agent.name, action: "create" as const };
      if (options.conflict_policy === "skip") {
        return { name: agent.name, action: "skip" as const, reason: "already exists" };
      }
      if (options.conflict_policy === "error") {
        const reason = "already exists";
        errors.push({ type: "agent", target: agent.name, message: reason });
        return { name: agent.name, action: "error" as const, reason };
      }
      return { name: agent.name, action: "update" as const };
    });

    const extToName = new Map<string, string>();
    bundle.agents.forEach((agent) => {
      if (agent.external_key) extToName.set(agent.external_key.toLowerCase(), agent.name);
    });

    const instructionActions = (bundle.instructions ?? []).map((instruction) => {
      const externalName = instruction.agent_external_key ? extToName.get(instruction.agent_external_key.toLowerCase()) : null;
      const targetName = externalName ?? instruction.agent_name ?? "";
      if (!targetName) {
        const reason = "target agent not found in bundle";
        errors.push({ type: "instruction", target: "unknown", message: reason });
        return { target: "unknown", action: "error" as const, reason };
      }
      const targetAgent = findAgentByName(targetName);
      if (!targetAgent && options.conflict_policy === "skip") {
        return { target: targetName, action: "skip" as const, reason: "target agent missing" };
      }
      if (!targetAgent && options.conflict_policy === "error") {
        const reason = "target agent missing";
        errors.push({ type: "instruction", target: targetName, message: reason });
        return { target: targetName, action: "error" as const, reason };
      }
      return { target: targetName, action: "update" as const };
    });

    const customSkillsDir = path.join(logsDir, "..", "custom-skills");
    const skillActions = (bundle.skills ?? []).map((skill) => {
      const existing = resolveCustomSkillDirectory(customSkillsDir, skill.skillName);
      if (!existing) return { skillName: skill.skillName, action: "create" as const };
      if (options.conflict_policy === "skip") {
        return { skillName: skill.skillName, action: "skip" as const, reason: "already exists" };
      }
      if (options.conflict_policy === "error") {
        const reason = "already exists";
        errors.push({ type: "skill", target: skill.skillName, message: reason });
        return { skillName: skill.skillName, action: "error" as const, reason };
      }
      return { skillName: skill.skillName, action: "update" as const };
    });

    return {
      preview: {
        agent_actions: agentActions,
        instruction_actions: instructionActions,
        skill_actions: skillActions,
      },
      errors,
    };
  }

  app.post("/api/agents/bundle/import/preview", async (req, res) => {
    const parsed = await parseBundlePayload(req.body);
    const options = parseImportOptions(req.body?.options);
    if (!parsed.bundle) {
      return res.status(400).json({ ok: false, format: parsed.format, errors: parsed.errors });
    }

    const { preview, errors } = collectPreview(parsed.bundle, options);
    res.json({
      ok: errors.length === 0,
      format: parsed.format,
      options,
      preview,
      errors,
    });
  });

  app.post("/api/agents/bundle/import/apply", async (req, res) => {
    const parsed = await parseBundlePayload(req.body);
    const options = parseImportOptions(req.body?.options);
    if (!parsed.bundle) {
      return res.status(400).json({ ok: false, format: parsed.format, errors: parsed.errors });
    }

    const { preview, errors } = collectPreview(parsed.bundle, options);
    if (errors.length > 0) {
      return res.status(400).json({ ok: false, format: parsed.format, preview, errors });
    }

    const bundle = parsed.bundle;
    const agentNameToId = new Map<string, string>();
    const externalToName = new Map<string, string>();
    bundle.agents.forEach((agent) => {
      if (agent.external_key) externalToName.set(agent.external_key.toLowerCase(), agent.name);
    });

    let createdAgents = 0;
    let updatedAgents = 0;
    let skippedAgents = 0;
    let updatedInstructions = 0;
    let skippedInstructions = 0;
    let createdSkills = 0;
    let updatedSkills = 0;
    let skippedSkills = 0;

    const customSkillsDir = path.join(logsDir, "..", "custom-skills");
    fs.mkdirSync(customSkillsDir, { recursive: true });

    try {
      for (const agent of bundle.agents) {
        const existing = findAgentByName(agent.name);
        if (!existing) {
          const id = randomUUID();
          db.prepare(
            `INSERT INTO agents (id, name, name_ko, name_ja, name_zh, department_id, role, cli_provider, avatar_emoji, sprite_number, personality)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ).run(
            id,
            agent.name,
            normalizeText(agent.name_ko) || "",
            normalizeText(agent.name_ja) || "",
            normalizeText(agent.name_zh) || "",
            agent.department_id ?? null,
            agent.role ?? "junior",
            agent.cli_provider ?? "claude",
            agent.avatar_emoji ?? "🤖",
            typeof agent.sprite_number === "number" ? agent.sprite_number : null,
            agent.personality ?? null,
          );
          agentNameToId.set(agent.name.toLowerCase(), id);
          createdAgents += 1;
          continue;
        }

        if (options.conflict_policy === "skip") {
          agentNameToId.set(agent.name.toLowerCase(), existing.id);
          skippedAgents += 1;
          continue;
        }

        db.prepare(
          `UPDATE agents
             SET name_ko = ?, name_ja = ?, name_zh = ?, department_id = ?, role = ?, cli_provider = ?, avatar_emoji = ?, sprite_number = ?, personality = ?
           WHERE id = ?`,
        ).run(
          normalizeText(agent.name_ko) || "",
          normalizeText(agent.name_ja) || "",
          normalizeText(agent.name_zh) || "",
          agent.department_id ?? null,
          agent.role ?? "junior",
          agent.cli_provider ?? "claude",
          agent.avatar_emoji ?? "🤖",
          typeof agent.sprite_number === "number" ? agent.sprite_number : null,
          agent.personality ?? null,
          existing.id,
        );
        agentNameToId.set(agent.name.toLowerCase(), existing.id);
        updatedAgents += 1;
      }

      if (options.include_instructions) {
        for (const instruction of bundle.instructions ?? []) {
          const fromExternal = instruction.agent_external_key
            ? externalToName.get(instruction.agent_external_key.toLowerCase())
            : null;
          const targetName = (fromExternal ?? instruction.agent_name ?? "").toLowerCase();
          if (!targetName) {
            skippedInstructions += 1;
            continue;
          }

          let targetId = agentNameToId.get(targetName);
          if (!targetId) {
            const existing = findAgentByName(targetName);
            if (existing) targetId = existing.id;
          }

          if (!targetId) {
            skippedInstructions += 1;
            continue;
          }

          const now = nowMs();
          db.prepare(
            `INSERT INTO agent_instructions (id, agent_id, content, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(agent_id) DO UPDATE SET
               content = excluded.content,
               updated_at = excluded.updated_at`,
          ).run(randomUUID(), targetId, instruction.content, now, now);
          updatedInstructions += 1;
        }
      }

      if (options.include_skills) {
        for (const skill of bundle.skills ?? []) {
          const existing = resolveCustomSkillDirectory(customSkillsDir, skill.skillName);
          if (existing && options.conflict_policy === "skip") {
            skippedSkills += 1;
            continue;
          }

          const canonicalSkillName = skill.skillName.toLowerCase();
          const skillDir = path.join(customSkillsDir, canonicalSkillName);
          fs.mkdirSync(skillDir, { recursive: true });
          fs.writeFileSync(path.join(skillDir, "skills.md"), skill.content, "utf-8");

          const providers = normalizeSkillLearnProviders(skill.providers ?? ["claude"]);
          const now = Date.now();
          fs.writeFileSync(
            path.join(skillDir, "meta.json"),
            JSON.stringify(
              {
                skillName: skill.skillName,
                canonicalSkillName,
                providers,
                createdAt: now,
                updatedAt: now,
                contentLength: skill.content.length,
              },
              null,
              2,
            ),
            "utf-8",
          );

          const jobId = randomUUID();
          for (const provider of providers) {
            db.prepare(
              `
              INSERT INTO skill_learning_history
                (id, job_id, provider, repo, skill_id, skill_label, status, command, error, run_started_at, run_completed_at, created_at, updated_at)
              VALUES
                (?, ?, ?, ?, ?, ?, 'succeeded', ?, NULL, ?, ?, ?, ?)
            `,
            ).run(
              randomUUID(),
              jobId,
              provider,
              `custom/${canonicalSkillName}`,
              canonicalSkillName,
              skill.skillName,
              `bundle import: ${skill.skillName}`,
              now,
              now,
              now,
              now,
            );
          }

          if (existing) {
            updatedSkills += 1;
          } else {
            createdSkills += 1;
          }
        }
      }

      res.json({
        ok: true,
        format: parsed.format,
        preview,
        result: {
          createdAgents,
          updatedAgents,
          skippedAgents,
          updatedInstructions,
          skippedInstructions,
          createdSkills,
          updatedSkills,
          skippedSkills,
        },
      });
    } catch (err) {
      console.error("[agent-bundle:apply]", err);
      res.status(500).json({ ok: false, error: "bundle_apply_failed" });
    }
  });

  app.post("/api/agents/bundle/export", async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
      const includeInstructions = body.includeInstructions !== false;
      const includeSkills = body.includeSkills === true;
      const format = parseBundleTransportFormat(body.format);
      const requestedAgentIds = Array.isArray(body.agentIds)
        ? body.agentIds.map((value) => normalizeText(value)).filter((value) => value.length > 0)
        : [];

      const agents = (requestedAgentIds.length > 0
        ? db
            .prepare(
              `SELECT id, name, name_ko, name_ja, name_zh, department_id, role, cli_provider, avatar_emoji, sprite_number, personality
               FROM agents
               WHERE id IN (${requestedAgentIds.map(() => "?").join(",")})
               ORDER BY name`,
            )
            .all(...requestedAgentIds)
        : db
            .prepare(
              `SELECT id, name, name_ko, name_ja, name_zh, department_id, role, cli_provider, avatar_emoji, sprite_number, personality
               FROM agents
               WHERE id NOT LIKE '%-seed-%'
               ORDER BY name`,
            )
            .all()) as Array<Record<string, unknown>>;

      const bundleAgents: BundleAgent[] = agents.map((agent) => ({
        external_key: normalizeText(agent.id) || undefined,
        name: normalizeText(agent.name),
        name_ko: normalizeText(agent.name_ko) || undefined,
        name_ja: normalizeText(agent.name_ja) || undefined,
        name_zh: normalizeText(agent.name_zh) || undefined,
        department_id: normalizeNullableText(agent.department_id),
        role: normalizeText(agent.role) || undefined,
        cli_provider: normalizeText(agent.cli_provider) || undefined,
        avatar_emoji: normalizeText(agent.avatar_emoji) || undefined,
        sprite_number: typeof agent.sprite_number === "number" ? agent.sprite_number : null,
        personality: normalizeNullableText(agent.personality),
      }));

      const bundleInstructions: BundleInstruction[] = [];
      if (includeInstructions && bundleAgents.length > 0) {
        const agentIdMap = new Map<string, string>();
        agents.forEach((agent) => {
          const id = normalizeText(agent.id);
          const name = normalizeText(agent.name);
          if (id && name) agentIdMap.set(id, name);
        });
        const rows = db
          .prepare(
            `SELECT agent_id, content FROM agent_instructions WHERE agent_id IN (${Array.from(agentIdMap.keys())
              .map(() => "?")
              .join(",")})`,
          )
          .all(...Array.from(agentIdMap.keys())) as Array<{ agent_id?: unknown; content?: unknown }>;
        rows.forEach((row) => {
          const agentId = normalizeText(row.agent_id);
          const content = normalizeInstructionContent(row.content);
          if (!agentId || !content) return;
          const agentName = agentIdMap.get(agentId);
          if (!agentName) return;
          bundleInstructions.push({ agent_external_key: agentId, agent_name: agentName, content });
        });
      }

      const bundleSkills: BundleSkill[] = [];
      if (includeSkills) {
        const customSkillsDir = path.join(logsDir, "..", "custom-skills");
        if (fs.existsSync(customSkillsDir)) {
          const entries = fs.readdirSync(customSkillsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
          entries.forEach((entry) => {
            const skillDir = path.join(customSkillsDir, entry.name);
            const skillFile = path.join(skillDir, "skills.md");
            if (!fs.existsSync(skillFile)) return;
            const content = fs.readFileSync(skillFile, "utf-8").trim();
            if (!content) return;
            const metaPath = path.join(skillDir, "meta.json");
            let skillName = entry.name;
            let providers: string[] = ["claude"];
            if (fs.existsSync(metaPath)) {
              try {
                const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as Record<string, unknown>;
                const named = normalizeText(meta.skillName);
                if (named) skillName = named;
                providers = normalizeSkillLearnProviders(meta.providers);
              } catch {
                // Ignore malformed metadata.
              }
            }
            bundleSkills.push({ skillName, content, providers });
          });
        }
      }

      const bundle: AgentBundle = {
        bundle_version: "1.0",
        exported_at: Date.now(),
        source: {
          app: "corbot-empire",
          version: "2.x",
        },
        agents: bundleAgents,
        instructions: bundleInstructions,
        skills: bundleSkills,
      };

      if (format === "zip") {
        const archiveBase64 = await encodeBundleAsZip(bundle);
        res.json({
          ok: true,
          format,
          file_name: `agent-bundle-${new Date().toISOString().slice(0, 10)}.zip`,
          archive_base64: archiveBase64,
        });
        return;
      }

      res.json({
        ok: true,
        format,
        file_name: `agent-bundle-${new Date().toISOString().slice(0, 10)}.json`,
        bundle,
      });
    } catch (err) {
      console.error("[agent-bundle:export]", err);
      res.status(500).json({ ok: false, error: "bundle_export_failed" });
    }
  });
}
