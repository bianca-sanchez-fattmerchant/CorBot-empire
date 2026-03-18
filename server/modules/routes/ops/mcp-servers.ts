import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import type { RuntimeContext } from "../../../types/runtime-context.ts";

type StoredMcpServer = {
  id?: unknown;
  name?: unknown;
  command?: unknown;
  args?: unknown;
  env?: unknown;
  cwd?: unknown;
  setupCommand?: unknown;
  enabled?: unknown;
};

type NormalizedMcpServer = {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  cwd?: string;
  setupCommand?: string;
  enabled: boolean;
};

function readMcpServersFromSettings(ctx: RuntimeContext): NormalizedMcpServer[] {
  const row = ctx.db.prepare("SELECT value FROM settings WHERE key = 'mcpServers' LIMIT 1").get() as
    | { value?: unknown }
    | undefined;
  if (!row || row.value === undefined) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(row.value));
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const servers: NormalizedMcpServer[] = [];
  for (const item of parsed as StoredMcpServer[]) {
    const id = typeof item?.id === "string" ? item.id.trim() : "";
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    const command = typeof item?.command === "string" ? item.command.trim() : "";
    const args = Array.isArray(item?.args)
      ? item.args
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

    const envRaw = item?.env;
    const env: Record<string, string> = {};
    if (envRaw && typeof envRaw === "object" && !Array.isArray(envRaw)) {
      for (const [key, value] of Object.entries(envRaw as Record<string, unknown>)) {
        const envKey = String(key).trim();
        const envValue = typeof value === "string" ? value : String(value ?? "");
        if (envKey) env[envKey] = envValue;
      }
    }

    const setupCommand = typeof item?.setupCommand === "string" ? item.setupCommand.trim() : "";
    const cwdRaw = typeof item?.cwd === "string" ? item.cwd.trim() : "";

    if (!id || !name) continue;
    if (!setupCommand && !command) continue;

    servers.push({
      id,
      name,
      command,
      args,
      env,
      cwd: cwdRaw || undefined,
      setupCommand: setupCommand || undefined,
      enabled: item?.enabled !== false,
    });
  }

  return servers;
}

function runCommand(params: {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  shellCommand?: string;
}): Promise<{ code: number; stdout: string; stderr: string; durationMs: number }> {
  const { command, args, cwd, env, timeoutMs, shellCommand } = params;
  const start = Date.now();

  return new Promise((resolve) => {
    const maxOutput = 200_000;
    let stdout = "";
    let stderr = "";
    let settled = false;

    const child = shellCommand
      ? spawn(process.platform === "win32" ? "cmd.exe" : "/bin/zsh", process.platform === "win32" ? ["/d", "/s", "/c", shellCommand] : ["-lc", shellCommand], {
          cwd,
          env: { ...process.env, ...env },
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        })
      : spawn(command, args, {
          cwd,
          env: { ...process.env, ...env },
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        });

    const settle = (code: number) => {
      if (settled) return;
      settled = true;
      resolve({ code, stdout, stderr, durationMs: Date.now() - start });
    };

    const timeoutHandle = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2500);
      settle(124);
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      if (stdout.length >= maxOutput) return;
      stdout += chunk.toString("utf8");
      if (stdout.length > maxOutput) stdout = stdout.slice(0, maxOutput);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length >= maxOutput) return;
      stderr += chunk.toString("utf8");
      if (stderr.length > maxOutput) stderr = stderr.slice(0, maxOutput);
    });

    child.on("error", (error) => {
      clearTimeout(timeoutHandle);
      if (!stderr) stderr = String(error?.message ?? error);
      settle(1);
    });

    child.on("close", (code) => {
      clearTimeout(timeoutHandle);
      settle(typeof code === "number" ? code : 1);
    });
  });
}

export function registerMcpServerRoutes(ctx: RuntimeContext): void {
  const { app } = ctx;

  app.get("/api/mcp/servers", (_req, res) => {
    const servers = readMcpServersFromSettings(ctx);
    res.json({ servers });
  });

  app.post("/api/mcp/setup", async (req, res) => {
    const id = String(req.body?.id ?? "").trim();
    if (!id) {
      return res.status(400).json({ error: "id_required" });
    }

    const servers = readMcpServersFromSettings(ctx);
    const target = servers.find((server) => server.id === id);
    if (!target) {
      return res.status(404).json({ error: "server_not_found" });
    }
    if (target.enabled === false) {
      return res.status(409).json({ error: "server_disabled" });
    }

    let cwd = process.cwd();
    if (target.cwd) {
      const candidate = path.isAbsolute(target.cwd) ? target.cwd : path.resolve(process.cwd(), target.cwd);
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
          cwd = candidate;
        }
      } catch {
        // fall back to process cwd
      }
    }

    const command = target.command.trim();
    const args = target.args;
    const setupCommand = target.setupCommand?.trim();
    if (!setupCommand && !command) {
      return res.status(400).json({ error: "command_missing" });
    }

    const result = await runCommand({
      command,
      args,
      cwd,
      env: target.env,
      timeoutMs: 120_000,
      shellCommand: setupCommand,
    });

    res.json({
      ok: result.code === 0,
      code: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: result.durationMs,
    });
  });
}