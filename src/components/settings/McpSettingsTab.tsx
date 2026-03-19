import { useMemo, useState } from "react";
import type { McpServerConfig } from "../../types";
import type { McpServerDraft, McpSettingsTabProps } from "./types";

type McpQuickTemplate = {
  key: string;
  name: string;
  summary: string;
  setupCommand: string;
};

function toDraft(server?: McpServerConfig): McpServerDraft {
  if (!server) {
    return {
      id: "",
      name: "",
      command: "",
      args: "",
      env: "",
      cwd: "",
      setupCommand: "",
      enabled: true,
    };
  }

  const envLines = Object.entries(server.env ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  return {
    id: server.id,
    name: server.name,
    command: server.command,
    args: (server.args ?? []).join(" "),
    env: envLines,
    cwd: server.cwd ?? "",
    setupCommand: server.setupCommand ?? "",
    enabled: server.enabled !== false,
  };
}

function parseArgs(input: string): string[] {
  return input
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseEnv(input: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of input.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    result[key] = value;
  }
  return result;
}

function validateDraft(draft: McpServerDraft): string | null {
  if (!draft.name.trim()) return "name_required";
  if (!draft.setupCommand.trim() && !draft.command.trim()) return "command_required";
  return null;
}

export default function McpSettingsTab({ t, form, setForm, persistSettings, onSetupServer }: McpSettingsTabProps) {
  const servers = useMemo(() => form.mcpServers ?? [], [form.mcpServers]);
  const [draft, setDraft] = useState<McpServerDraft>(() => toDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [setupRunningId, setSetupRunningId] = useState<string | null>(null);
  const [setupResultById, setSetupResultById] = useState<Record<string, string>>({});

  const quickTemplates = useMemo<McpQuickTemplate[]>(
    () => [
      {
        key: "playwright",
        name: t({ ko: "Browser Automation", en: "Browser Automation", ja: "ブラウザ自動化", zh: "浏览器自动化" }),
        summary: t({
          ko: "웹 페이지를 탐색하고 테스트하는 MCP 서버",
          en: "MCP server for browsing and testing web pages",
          ja: "Web ページの閲覧とテスト向け MCP サーバー",
          zh: "用于网页浏览和测试的 MCP 服务器",
        }),
        setupCommand: "codex mcp add playwright -- npx @playwright/mcp@latest",
      },
      {
        key: "filesystem",
        name: t({ ko: "Filesystem", en: "Filesystem", ja: "ファイルシステム", zh: "文件系统" }),
        summary: t({
          ko: "폴더와 파일을 읽고 정리하는 MCP 서버",
          en: "MCP server for reading and organizing files",
          ja: "フォルダとファイルの読み쓰기向け MCP サーバー",
          zh: "用于读取和整理文件的 MCP 服务器",
        }),
        setupCommand: "codex mcp add filesystem -- npx @modelcontextprotocol/server-filesystem .",
      },
      {
        key: "github",
        name: t({ ko: "GitHub", en: "GitHub", ja: "GitHub", zh: "GitHub" }),
        summary: t({
          ko: "이슈, PR, 리포지토리를 다루는 MCP 서버",
          en: "MCP server for issues, PRs, and repositories",
          ja: "Issue, PR, リポジトリ向け MCP サーバー",
          zh: "用于 issues、PR 和仓库的 MCP 服务器",
        }),
        setupCommand: "codex mcp add github -- npx @modelcontextprotocol/server-github",
      },
    ],
    [t],
  );

  const errorMessage =
    saveError === "name_required"
      ? t({
          ko: "서버 이름을 입력해주세요.",
          en: "Please enter a server name.",
          ja: "サーバー名を入力してください。",
          zh: "请输入服务器名称。",
        })
      : saveError === "command_required"
        ? t({
            ko: "Setup 명령 또는 command를 입력해주세요.",
            en: "Please provide a setup command or command.",
            ja: "Setup コマンドまたは command を入力してください。",
            zh: "请提供 setup command 或 command。",
          })
        : null;

  const applyServers = (nextServers: McpServerConfig[]) => {
    const nextForm = { ...form, mcpServers: nextServers };
    setForm(nextForm);
    persistSettings(nextForm);
  };

  const resetDraft = () => {
    setDraft(toDraft());
    setEditingId(null);
    setSaveError(null);
    setShowAdvanced(false);
  };

  const applyTemplate = (template: McpQuickTemplate) => {
    setDraft((prev) => ({
      ...prev,
      name: template.name,
      setupCommand: template.setupCommand,
      command: "",
      args: "",
    }));
    setSaveError(null);
  };

  const onSaveServer = () => {
    const errorCode = validateDraft(draft);
    if (errorCode) {
      setSaveError(errorCode);
      return;
    }

    const parsedEnv = parseEnv(draft.env);
    const nextServer: McpServerConfig = {
      id: editingId ?? (globalThis.crypto?.randomUUID?.() ?? `mcp-${Date.now()}`),
      name: draft.name.trim(),
      command: draft.command.trim(),
      args: parseArgs(draft.args),
      env: Object.keys(parsedEnv).length > 0 ? parsedEnv : undefined,
      cwd: draft.cwd.trim() || undefined,
      setupCommand: draft.setupCommand.trim() || undefined,
      enabled: draft.enabled,
    };

    const nextServers = editingId
      ? servers.map((server) => (server.id === editingId ? nextServer : server))
      : [...servers, nextServer];
    applyServers(nextServers);
    resetDraft();
  };

  const onDeleteServer = (id: string) => {
    const nextServers = servers.filter((server) => server.id !== id);
    applyServers(nextServers);
    setSetupResultById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (editingId === id) resetDraft();
  };

  const onEditServer = (server: McpServerConfig) => {
    setEditingId(server.id);
    setDraft(toDraft(server));
    setSaveError(null);
  };

  const onToggleServer = (id: string) => {
    const nextServers = servers.map((server) =>
      server.id === id ? { ...server, enabled: server.enabled === false } : server,
    );
    applyServers(nextServers);
  };

  const onRunSetup = async (id: string) => {
    setSetupRunningId(id);
    try {
      const result = await onSetupServer(id);
      const lines = [
        result.ok
          ? t({ ko: "Setup completed", en: "Setup completed", ja: "セットアップ完了", zh: "设置完成" })
          : t({ ko: "Setup failed", en: "Setup failed", ja: "セットアップ失敗", zh: "设置失败" }),
        `${t({ ko: "Exit code", en: "Exit code", ja: "終了コード", zh: "退出码" })}: ${result.code}`,
      ];
      if (result.stderr.trim()) {
        lines.push(result.stderr.trim());
      } else if (result.stdout.trim()) {
        lines.push(result.stdout.trim());
      }
      setSetupResultById((prev) => ({ ...prev, [id]: lines.join("\n") }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSetupResultById((prev) => ({ ...prev, [id]: message }));
    } finally {
      setSetupRunningId(null);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-700/50 bg-slate-800/60 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          {t({ ko: "MCP Servers", en: "MCP Servers", ja: "MCP サーバー", zh: "MCP 服务器" })}
        </h3>
      </div>

      <p className="text-xs text-slate-500">
        {t({
          ko: "추천 템플릿을 선택하고 저장한 뒤 자동 연결을 누르면 설치/연결을 시도합니다.",
          en: "Choose a template, save it, then click Auto Setup to install/connect.",
          ja: "テンプレートを選んで保存し、自動セットアップを押すとインストール/接続を試みます。",
          zh: "选择模板并保存后，点击自动设置即可尝试安装/连接。",
        })}
      </p>

      <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
        <div className="mb-2 text-xs font-semibold text-slate-300">
          {t({
            ko: "빠른 시작 템플릿",
            en: "Quick Start Templates",
            ja: "クイックスタート テンプレート",
            zh: "快速开始模板",
          })}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {quickTemplates.map((template) => (
            <button
              key={template.key}
              type="button"
              onClick={() => applyTemplate(template)}
              className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-left transition-colors hover:border-blue-500/60 hover:bg-slate-800"
            >
              <div className="text-xs font-semibold text-white">{template.name}</div>
              <div className="mt-1 text-[11px] text-slate-400">{template.summary}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
        <input
          type="text"
          value={draft.name}
          onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
          placeholder={t({
            ko: "서버 이름 (예: Browser Automation)",
            en: "Server name (e.g. Browser Automation)",
            ja: "サーバー名 (例: Browser Automation)",
            zh: "服务器名称 (例如 Browser Automation)",
          })}
          className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />

        <label className="text-xs text-slate-400">
          {t({ ko: "Setup command", en: "Setup command", ja: "セットアップコマンド", zh: "设置命令" })}
        </label>
        <textarea
          value={draft.setupCommand}
          onChange={(event) => setDraft((prev) => ({ ...prev, setupCommand: event.target.value }))}
          placeholder={t({
            ko: "예: codex mcp add playwright -- npx @playwright/mcp@latest",
            en: "e.g. codex mcp add playwright -- npx @playwright/mcp@latest",
            ja: "例: codex mcp add playwright -- npx @playwright/mcp@latest",
            zh: "例如: codex mcp add playwright -- npx @playwright/mcp@latest",
          })}
          rows={2}
          className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
        />

        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="text-left text-xs text-blue-300 hover:text-blue-200"
        >
          {showAdvanced
            ? t({ ko: "Hide advanced options", en: "Hide advanced options", ja: "詳細設定を隠す", zh: "隐藏高级选项" })
            : t({ ko: "Show advanced options", en: "Show advanced options", ja: "詳細設定を表示", zh: "显示高级选项" })}
        </button>

        {showAdvanced && (
          <div className="space-y-2 rounded-lg border border-slate-700/50 bg-slate-900/30 p-2.5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={draft.command}
                onChange={(event) => setDraft((prev) => ({ ...prev, command: event.target.value }))}
                placeholder={t({ ko: "Command (e.g. npx)", en: "Command (e.g. npx)", ja: "コマンド (例: npx)", zh: "命令 (例如 npx)" })}
                className="rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                value={draft.args}
                onChange={(event) => setDraft((prev) => ({ ...prev, args: event.target.value }))}
                placeholder={t({ ko: "Args (space separated)", en: "Args (space separated)", ja: "引数 (スペース区切り)", zh: "参数 (空格分隔)" })}
                className="rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <input
              type="text"
              value={draft.cwd}
              onChange={(event) => setDraft((prev) => ({ ...prev, cwd: event.target.value }))}
              placeholder={t({ ko: "Working directory (optional)", en: "Working directory (optional)", ja: "作業ディレクトリ (任意)", zh: "工作目录 (可选)" })}
              className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />

            <textarea
              value={draft.env}
              onChange={(event) => setDraft((prev) => ({ ...prev, env: event.target.value }))}
              placeholder={t({
                ko: "환경 변수 (한 줄당 KEY=VALUE)",
                en: "Environment vars (one KEY=VALUE per line)",
                ja: "環境変数 (1行に KEY=VALUE)",
                zh: "环境变量 (每行 KEY=VALUE)",
              })}
              rows={3}
              className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 font-mono text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        <label className="inline-flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={draft.enabled !== false}
            onChange={(event) => setDraft((prev) => ({ ...prev, enabled: event.target.checked }))}
          />
          {t({ ko: "Enabled", en: "Enabled", ja: "有効", zh: "启用" })}
        </label>

        {errorMessage && <div className="text-xs text-rose-400">{errorMessage}</div>}

        <div className="flex gap-2">
          <button
            onClick={onSaveServer}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
          >
            {editingId
              ? t({ ko: "Update Server", en: "Update Server", ja: "サーバー更新", zh: "更新服务器" })
              : t({ ko: "Add Server", en: "Add Server", ja: "サーバー追加", zh: "添加服务器" })}
          </button>
          {editingId && (
            <button
              onClick={resetDraft}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700/40"
            >
              {t({ ko: "Cancel", en: "Cancel", ja: "キャンセル", zh: "取消" })}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {servers.length === 0 ? (
          <div className="rounded-lg border border-slate-700/40 bg-slate-900/30 p-3 text-xs text-slate-500">
            {t({
              ko: "등록된 MCP 서버가 없습니다.",
              en: "No MCP servers registered yet.",
              ja: "登録された MCP サーバーがありません。",
              zh: "尚未注册 MCP 服务器。",
            })}
          </div>
        ) : (
          servers.map((server) => (
            <div key={server.id} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{server.name}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        server.enabled === false ? "bg-slate-700 text-slate-400" : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {server.enabled === false
                        ? t({ ko: "Disabled", en: "Disabled", ja: "無効", zh: "禁用" })
                        : t({ ko: "Enabled", en: "Enabled", ja: "有効", zh: "启用" })}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {(server.setupCommand?.trim() || [server.command, ...(server.args ?? [])].join(" ")).trim()}
                  </div>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => onToggleServer(server.id)}
                    className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700/40"
                  >
                    {server.enabled === false
                      ? t({ ko: "Enable", en: "Enable", ja: "有効化", zh: "启用" })
                      : t({ ko: "Disable", en: "Disable", ja: "無効化", zh: "禁用" })}
                  </button>
                  <button
                    onClick={() => onEditServer(server)}
                    className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700/40"
                  >
                    {t({ ko: "Edit", en: "Edit", ja: "編集", zh: "编辑" })}
                  </button>
                  <button
                    onClick={() => onDeleteServer(server.id)}
                    className="rounded border border-rose-600/50 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-600/10"
                  >
                    {t({ ko: "Delete", en: "Delete", ja: "削除", zh: "删除" })}
                  </button>
                  <button
                    onClick={() => void onRunSetup(server.id)}
                    disabled={setupRunningId === server.id || server.enabled === false}
                    className="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {setupRunningId === server.id
                      ? t({ ko: "Connecting...", en: "Connecting...", ja: "接続中...", zh: "连接中..." })
                      : t({ ko: "Auto Setup", en: "Auto Setup", ja: "自動セットアップ", zh: "自动设置" })}
                  </button>
                </div>
              </div>

              {setupResultById[server.id] && (
                <pre className="mt-2 max-h-36 overflow-auto rounded bg-black/30 p-2 text-[11px] text-slate-300">
                  {setupResultById[server.id]}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
