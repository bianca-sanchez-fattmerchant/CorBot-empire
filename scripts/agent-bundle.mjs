#!/usr/bin/env node
/* eslint-env node */
/* global console, process, fetch */

import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] || "";
  const options = {
    host: "http://127.0.0.1:8790",
    out: "",
    file: "",
    format: "",
    includeSkills: false,
    includeInstructions: true,
    agentIds: [],
    conflictPolicy: "skip",
    previewOnly: false,
    apply: false,
  };

  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i];
    if ((arg === "--host" || arg === "-h") && args[i + 1]) {
      options.host = args[i + 1];
      i += 1;
      continue;
    }
    if ((arg === "--out" || arg === "-o") && args[i + 1]) {
      options.out = args[i + 1];
      i += 1;
      continue;
    }
    if ((arg === "--file" || arg === "-f") && args[i + 1]) {
      options.file = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--format" && args[i + 1]) {
      options.format = args[i + 1].trim().toLowerCase();
      i += 1;
      continue;
    }
    if (arg === "--include-skills") {
      options.includeSkills = true;
      continue;
    }
    if (arg === "--exclude-instructions") {
      options.includeInstructions = false;
      continue;
    }
    if (arg === "--agent-ids" && args[i + 1]) {
      options.agentIds = args[i + 1]
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      i += 1;
      continue;
    }
    if (arg === "--conflict-policy" && args[i + 1]) {
      options.conflictPolicy = args[i + 1].trim();
      i += 1;
      continue;
    }
    if (arg === "--preview") {
      options.previewOnly = true;
      continue;
    }
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
  }

  return { command, options };
}

function printUsage() {
  console.log(`Usage:
  pnpm run agent-bundle:export -- --out ./agent-bundle.json [--format json|zip] [--include-skills] [--agent-ids id1,id2] [--host http://127.0.0.1:8790]
  pnpm run agent-bundle:export -- --out ./agent-bundle.zip [--include-skills] [--host http://127.0.0.1:8790]
  pnpm run agent-bundle:import -- --file ./agent-bundle.json --preview [--conflict-policy skip|update|error] [--host http://127.0.0.1:8790]
  pnpm run agent-bundle:import -- --file ./agent-bundle.zip --apply [--conflict-policy skip|update|error] [--host http://127.0.0.1:8790]
`);
}

function resolveFormatFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".zip") return "zip";
  return "json";
}

function normalizeFormat(input) {
  return input === "zip" ? "zip" : "json";
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

async function runExport(options) {
  const inferredFormat = options.out ? resolveFormatFromPath(options.out) : "json";
  const format = normalizeFormat(options.format || inferredFormat);
  const payload = await postJson(`${options.host}/api/agents/bundle/export`, {
    format,
    includeSkills: options.includeSkills,
    includeInstructions: options.includeInstructions,
    agentIds: options.agentIds,
  });

  const outputPath = options.out
    ? path.resolve(options.out)
    : path.resolve(process.cwd(), payload.file_name || `agent-bundle-${Date.now()}.${format === "zip" ? "zip" : "json"}`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  if ((payload.format || format) === "zip") {
    if (!payload.archive_base64) {
      throw new Error("export response did not include archive_base64 for zip format");
    }
    fs.writeFileSync(outputPath, Buffer.from(String(payload.archive_base64), "base64"));
    console.log(`Exported zip bundle to ${outputPath}`);
    return;
  }

  fs.writeFileSync(outputPath, JSON.stringify(payload.bundle, null, 2), "utf-8");
  console.log(`Exported bundle to ${outputPath}`);
  console.log(
    `Agents=${payload.bundle?.agents?.length ?? 0}, Instructions=${payload.bundle?.instructions?.length ?? 0}, Skills=${payload.bundle?.skills?.length ?? 0}`,
  );
}

async function runImport(options) {
  if (!options.file) {
    throw new Error("--file is required for import");
  }

  const filePath = path.resolve(options.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`bundle file not found: ${filePath}`);
  }

  const fileFormat = resolveFormatFromPath(filePath);
  const mode = options.apply ? "apply" : "preview";

  const requestBody = {
    format: fileFormat,
    options: {
      conflict_policy: options.conflictPolicy,
      match_by: "name",
      include_instructions: true,
      include_skills: true,
    },
  };

  if (fileFormat === "zip") {
    requestBody.archive_base64 = fs.readFileSync(filePath).toString("base64");
  } else {
    requestBody.bundle = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  const payload = await postJson(`${options.host}/api/agents/bundle/import/${mode}`, requestBody);

  if (mode === "preview") {
    const actions = payload.preview || {};
    console.log(`Preview complete. ok=${Boolean(payload.ok)}`);
    console.log(
      `agent_actions=${actions.agent_actions?.length ?? 0}, instruction_actions=${actions.instruction_actions?.length ?? 0}, skill_actions=${actions.skill_actions?.length ?? 0}`,
    );
    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      console.log("Errors:");
      payload.errors.forEach((err) => {
        console.log(`- [${err.type}] ${err.target || "unknown"}: ${err.message}`);
      });
    }
    return;
  }

  const result = payload.result || {};
  console.log("Import applied successfully.");
  console.log(
    `createdAgents=${result.createdAgents ?? 0}, updatedAgents=${result.updatedAgents ?? 0}, skippedAgents=${result.skippedAgents ?? 0}`,
  );
  console.log(
    `updatedInstructions=${result.updatedInstructions ?? 0}, skippedInstructions=${result.skippedInstructions ?? 0}`,
  );
  console.log(
    `createdSkills=${result.createdSkills ?? 0}, updatedSkills=${result.updatedSkills ?? 0}, skippedSkills=${result.skippedSkills ?? 0}`,
  );
}

async function main() {
  const { command, options } = parseArgs(process.argv);
  if (command !== "export" && command !== "import") {
    printUsage();
    process.exit(1);
  }

  if (command === "export") {
    await runExport(options);
    return;
  }

  if (!options.previewOnly && !options.apply) {
    throw new Error("Use either --preview or --apply with import");
  }
  if (options.previewOnly && options.apply) {
    throw new Error("Choose only one mode: --preview or --apply");
  }

  await runImport(options);
}

main().catch((err) => {
  console.error(`[agent-bundle] ${String(err?.message || err)}`);
  process.exit(1);
});
