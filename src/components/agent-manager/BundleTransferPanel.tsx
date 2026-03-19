import { useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import * as api from "../../api";
import type {
  AgentBundleApplyResponse,
  AgentBundleConflictPolicy,
  AgentBundleImportOptions,
  AgentBundleImportPayload,
  AgentBundlePreviewResponse,
} from "../../api/organization-projects";
import type { Translator } from "./types";

interface BundleTransferPanelProps {
  tr: Translator;
  onImported: () => void;
}

const TEMPLATE_BUNDLE = {
  bundle_version: "1.0",
  exported_at: Date.now(),
  source: {
    app: "corbot-empire",
    version: "template",
  },
  agents: [
    {
      external_key: "agent-growth-001",
      name: "Growth Analyst",
      name_ko: "Growth Analyst",
      name_ja: "Growth Analyst",
      name_zh: "Growth Analyst",
      department_id: null,
      role: "senior",
      cli_provider: "claude",
      avatar_emoji: "A",
      sprite_number: null,
      personality: "Data-driven, clear communicator, and practical.",
    },
  ],
  instructions: [
    {
      agent_external_key: "agent-growth-001",
      agent_name: "Growth Analyst",
      content:
        "Focus on measurable experiments, summarize key outcomes, and provide a short next-step plan in every report.",
    },
  ],
  skills: [
    {
      skillName: "growth-analysis-basics",
      providers: ["claude"],
      content: "# Growth Analysis Basics\n\n- Define baseline metrics.\n- Run one experiment at a time.\n- Report impact with confidence level.",
    },
  ],
};

const TEMPLATE_GUIDE = `# Agent Bundle Authoring Guide

Use this package to create agent docs outside the app and import them in bulk.

## Files
- bundle.json: Main bundle payload.

## Required Shape
- bundle_version: string
- agents: array of agent objects

## Agent Fields
- name (required)
- name_ko (optional)
- name_ja (optional)
- name_zh (optional)
- external_key (recommended for stable references)
- department_id (optional, null allowed)
- role (team_leader | senior | junior | intern)
- cli_provider (claude | codex | gemini | opencode | kimi | copilot | antigravity | api)
- avatar_emoji (optional)
- sprite_number (optional, number or null)
- personality (optional)

## Instruction Fields
- agent_external_key (preferred)
- agent_name (fallback)
- content (required)

## Skill Fields
- skillName (required)
- content (required)
- providers (optional string array)

## Import Tips
- Preview first to inspect create/update/skip actions.
- Choose conflict policy: skip, update, or error.
- Use update policy when syncing revised agent docs.
`;

function toBase64(arrayBuffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function fromBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function summarizePreview(preview?: AgentBundlePreviewResponse["preview"]): {
  create: number;
  update: number;
  skip: number;
  error: number;
} {
  const actions = [
    ...(preview?.agent_actions ?? []),
    ...(preview?.instruction_actions ?? []),
    ...(preview?.skill_actions ?? []),
  ];
  return actions.reduce(
    (acc, item) => {
      if (item.action === "create") acc.create += 1;
      else if (item.action === "update") acc.update += 1;
      else if (item.action === "skip") acc.skip += 1;
      else if (item.action === "error") acc.error += 1;
      return acc;
    },
    { create: 0, update: 0, skip: 0, error: 0 },
  );
}

export default function BundleTransferPanel({ tr, onImported }: BundleTransferPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [bundleFileName, setBundleFileName] = useState("");
  const [conflictPolicy, setConflictPolicy] = useState<AgentBundleConflictPolicy>("skip");
  const [includeInstructions, setIncludeInstructions] = useState(true);
  const [includeSkills, setIncludeSkills] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applyingImport, setApplyingImport] = useState(false);
  const [exportingBundle, setExportingBundle] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [previewData, setPreviewData] = useState<AgentBundlePreviewResponse | null>(null);
  const [applyData, setApplyData] = useState<AgentBundleApplyResponse | null>(null);
  const [lastPayload, setLastPayload] = useState<AgentBundleImportPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const previewSummary = useMemo(() => summarizePreview(previewData?.preview), [previewData]);

  async function buildImportPayload(file: File, options: AgentBundleImportOptions): Promise<AgentBundleImportPayload> {
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".zip")) {
      const bytes = await file.arrayBuffer();
      return {
        format: "zip",
        archive_base64: toBase64(bytes),
        options,
      };
    }
    const text = await file.text();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(tr("JSON 파싱 실패", "Failed to parse JSON bundle"));
    }
    return {
      format: "json",
      bundle: parsed,
      options,
    };
  }

  async function handlePickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBundleFileName(file.name);
    setPreviewData(null);
    setApplyData(null);
    setErrorMessage("");

    const options: AgentBundleImportOptions = {
      conflict_policy: conflictPolicy,
      match_by: "name",
      include_instructions: includeInstructions,
      include_skills: includeSkills,
    };

    setLoadingPreview(true);
    try {
      const payload = await buildImportPayload(file, options);
      const preview = await api.previewAgentBundleImport(payload);
      setLastPayload(payload);
      setPreviewData(preview);
      if (!preview.ok) {
        setErrorMessage(
          preview.errors?.map((error) => `${error.type}: ${error.target} (${error.message})`).join("\n") ||
            tr("미리보기 실패", "Preview reported validation errors"),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : tr("가져오기 실패", "Failed to load bundle preview");
      setErrorMessage(message);
      setLastPayload(null);
    } finally {
      setLoadingPreview(false);
      event.target.value = "";
    }
  }

  async function handleApplyImport() {
    if (!lastPayload) return;
    setApplyingImport(true);
    setErrorMessage("");
    try {
      const result = await api.applyAgentBundleImport(lastPayload);
      setApplyData(result);
      if (!result.ok) {
        setErrorMessage(
          result.errors?.map((error) => `${error.type}: ${error.target} (${error.message})`).join("\n") ||
            tr("가져오기 실패", "Import apply failed"),
        );
        return;
      }
      onImported();
    } catch (error) {
      const message = error instanceof Error ? error.message : tr("가져오기 실패", "Import apply failed");
      setErrorMessage(message);
    } finally {
      setApplyingImport(false);
    }
  }

  async function handleExportBundle() {
    setExportingBundle(true);
    setErrorMessage("");
    try {
      const result = await api.exportAgentBundle({
        format: "zip",
        includeInstructions: true,
        includeSkills: true,
      });
      if (result.format === "zip") {
        const bytes = fromBase64(result.archive_base64);
        saveBlob(new Blob([bytes], { type: "application/zip" }), result.file_name);
      } else {
        saveBlob(
          new Blob([JSON.stringify(result.bundle, null, 2)], { type: "application/json" }),
          result.file_name,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : tr("내보내기 실패", "Failed to export bundle");
      setErrorMessage(message);
    } finally {
      setExportingBundle(false);
    }
  }

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    setErrorMessage("");
    try {
      const zip = new JSZip();
      zip.file("bundle.json", JSON.stringify(TEMPLATE_BUNDLE, null, 2));
      zip.file("AGENT_DOC_TEMPLATE.md", TEMPLATE_GUIDE);
      const blob = await zip.generateAsync({ type: "blob" });
      saveBlob(blob, "agent-bundle-template.zip");
    } catch (error) {
      const message = error instanceof Error ? error.message : tr("템플릿 생성 실패", "Failed to create template");
      setErrorMessage(message);
    } finally {
      setDownloadingTemplate(false);
    }
  }

  const canApply = Boolean(lastPayload && previewData?.ok) && !applyingImport;

  return (
    <section
      className="rounded-xl p-4 space-y-3"
      style={{ background: "var(--th-card-bg)", border: "1px solid var(--th-card-border)" }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
            {tr("번들 가져오기/내보내기", "Bundle Import/Export")}
          </h3>
          <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>
            {tr(
              "ZIP 또는 JSON으로 팀원과 에이전트 구성을 공유하세요.",
              "Share agent setup with teammates using ZIP or JSON bundles.",
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportBundle}
            disabled={exportingBundle}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition disabled:opacity-60"
            style={{ borderColor: "var(--th-card-border)", color: "var(--th-text-primary)" }}
          >
            {exportingBundle ? tr("내보내는 중", "Exporting...") : tr("현재 구성 내보내기", "Export Current Bundle")}
          </button>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition disabled:opacity-60"
            style={{ borderColor: "var(--th-card-border)", color: "var(--th-text-primary)" }}
          >
            {downloadingTemplate ? tr("생성 중", "Preparing...") : tr("작성 템플릿 다운로드", "Download Authoring Template")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <label className="text-xs flex flex-col gap-1" style={{ color: "var(--th-text-muted)" }}>
          {tr("충돌 처리", "Conflict policy")}
          <select
            value={conflictPolicy}
            onChange={(event) => setConflictPolicy(event.target.value as AgentBundleConflictPolicy)}
            className="px-2 py-1.5 rounded-lg text-xs"
            style={{
              background: "var(--th-input-bg)",
              border: "1px solid var(--th-input-border)",
              color: "var(--th-text-primary)",
            }}
          >
            <option value="skip">skip</option>
            <option value="update">update</option>
            <option value="error">error</option>
          </select>
        </label>

        <label className="text-xs flex items-center gap-2" style={{ color: "var(--th-text-muted)" }}>
          <input
            type="checkbox"
            checked={includeInstructions}
            onChange={(event) => setIncludeInstructions(event.target.checked)}
          />
          {tr("지침 포함", "Include instructions")}
        </label>

        <label className="text-xs flex items-center gap-2" style={{ color: "var(--th-text-muted)" }}>
          <input type="checkbox" checked={includeSkills} onChange={(event) => setIncludeSkills(event.target.checked)} />
          {tr("스킬 포함", "Include skills")}
        </label>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loadingPreview}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition bg-blue-600 text-white disabled:opacity-60"
        >
          {loadingPreview ? tr("미리보기 생성 중", "Generating preview...") : tr("파일 선택 후 미리보기", "Pick File + Preview")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,.json,application/json,application/zip"
          className="hidden"
          onChange={handlePickFile}
        />
        <button
          type="button"
          onClick={handleApplyImport}
          disabled={!canApply}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition border disabled:opacity-60"
          style={{ borderColor: "var(--th-card-border)", color: "var(--th-text-primary)" }}
        >
          {applyingImport ? tr("가져오는 중", "Applying import...") : tr("가져오기 적용", "Apply Import")}
        </button>
        {bundleFileName && (
          <span className="text-xs" style={{ color: "var(--th-text-muted)" }}>
            {bundleFileName}
          </span>
        )}
      </div>

      {previewData && (
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="rounded-lg px-2 py-1.5" style={{ border: "1px solid var(--th-card-border)" }}>
            <div style={{ color: "var(--th-text-muted)" }}>create</div>
            <div className="font-semibold" style={{ color: "var(--th-text-heading)" }}>
              {previewSummary.create}
            </div>
          </div>
          <div className="rounded-lg px-2 py-1.5" style={{ border: "1px solid var(--th-card-border)" }}>
            <div style={{ color: "var(--th-text-muted)" }}>update</div>
            <div className="font-semibold" style={{ color: "var(--th-text-heading)" }}>
              {previewSummary.update}
            </div>
          </div>
          <div className="rounded-lg px-2 py-1.5" style={{ border: "1px solid var(--th-card-border)" }}>
            <div style={{ color: "var(--th-text-muted)" }}>skip</div>
            <div className="font-semibold" style={{ color: "var(--th-text-heading)" }}>
              {previewSummary.skip}
            </div>
          </div>
          <div className="rounded-lg px-2 py-1.5" style={{ border: "1px solid var(--th-card-border)" }}>
            <div style={{ color: "var(--th-text-muted)" }}>error</div>
            <div className="font-semibold" style={{ color: "var(--th-text-heading)" }}>
              {previewSummary.error}
            </div>
          </div>
        </div>
      )}

      {applyData?.result && (
        <div className="text-xs rounded-lg p-2" style={{ border: "1px solid var(--th-card-border)" }}>
          <div style={{ color: "var(--th-text-heading)" }}>{tr("적용 결과", "Import Result")}</div>
          <div style={{ color: "var(--th-text-muted)" }}>
            agents: +{applyData.result.createdAgents} / ~{applyData.result.updatedAgents} / {applyData.result.skippedAgents} skipped
          </div>
          <div style={{ color: "var(--th-text-muted)" }}>
            instructions: {applyData.result.updatedInstructions} updated / {applyData.result.skippedInstructions} skipped
          </div>
          <div style={{ color: "var(--th-text-muted)" }}>
            skills: +{applyData.result.createdSkills} / ~{applyData.result.updatedSkills} / {applyData.result.skippedSkills} skipped
          </div>
        </div>
      )}

      {errorMessage && (
        <pre
          className="text-xs whitespace-pre-wrap rounded-lg p-2"
          style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.4)", color: "#fecaca" }}
        >
          {errorMessage}
        </pre>
      )}
    </section>
  );
}
