import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../../api";
import type { Department, WorkflowPackKey } from "../../types";
import type { Translator } from "./types";

interface DepartmentInstructionsModalProps {
  department: Department;
  workflowPackKey?: WorkflowPackKey;
  tr: Translator;
  onClose: () => void;
}

export default function DepartmentInstructionsModal({
  department,
  workflowPackKey,
  tr,
  onClose,
}: DepartmentInstructionsModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getDepartmentInstructions(department.id, { workflowPackKey })
      .then((doc) => {
        if (cancelled) return;
        const next = doc.content ?? "";
        setContent(next);
        setSavedContent(next);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load department instructions:", err);
        setError(tr("부서 지시문을 불러오지 못했습니다.", "Failed to load department instructions."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [department.id, tr, workflowPackKey]);

  const handleSave = useCallback(async () => {
    const normalized = content.trim();
    if (!normalized) {
      setError(tr("지시문은 비워둘 수 없습니다.", "Instructions cannot be empty."));
      return;
    }
    if (normalized.length > 65535) {
      setError(tr("지시문이 너무 깁니다 (최대 65,535자).", "Instructions are too long (max 65,535 chars)."));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await api.updateDepartmentInstructions(department.id, normalized, { workflowPackKey });
      const next = saved.content ?? normalized;
      setContent(next);
      setSavedContent(next);
    } catch (err) {
      console.error("Failed to save department instructions:", err);
      setError(tr("부서 지시문 저장에 실패했습니다.", "Failed to save department instructions."));
    } finally {
      setSaving(false);
    }
  }, [content, department.id, tr, workflowPackKey]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.deleteDepartmentInstructions(department.id, { workflowPackKey });
      setContent("");
      setSavedContent("");
    } catch (err) {
      console.error("Failed to clear department instructions:", err);
      setError(tr("부서 지시문 삭제에 실패했습니다.", "Failed to clear department instructions."));
    } finally {
      setDeleting(false);
    }
  }, [department.id, tr, workflowPackKey]);

  const hasChanges = content !== savedContent;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--th-modal-overlay)" }}
      onClick={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto"
        style={{
          background: "var(--th-card-bg)",
          border: "1px solid var(--th-card-border)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: "var(--th-text-heading)" }}>
            {department.icon} {tr("부서 지시문", "Department Instructions")} · {department.name}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-(--th-bg-surface-hover) transition-colors"
            style={{ color: "var(--th-text-muted)" }}
          >
            ✕
          </button>
        </div>

        <p className="text-xs mb-2" style={{ color: "var(--th-text-muted)" }}>
          {tr(
            "이 지시문은 해당 부서의 모든 에이전트 실행 프롬프트에 공통으로 주입됩니다.",
            "These instructions are injected into execution prompts for all agents in this department.",
          )}
        </p>

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={12}
          disabled={loading || saving || deleting}
          className="w-full rounded-lg px-3 py-2 text-sm resize-y outline-none"
          style={{
            background: "var(--th-input-bg)",
            border: "1px solid var(--th-input-border)",
            color: "var(--th-text-primary)",
          }}
          placeholder={tr(
            "예: 이 부서는 변경 전후 영향도와 검증 기준을 항상 명시한다.",
            "Example: This department always specifies impact analysis and verification criteria before and after changes.",
          )}
        />

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs" style={{ color: "var(--th-text-muted)" }}>
            {content.length}/65535
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setContent(savedContent);
                setError(null);
              }}
              disabled={!hasChanges || loading || saving || deleting}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/10 disabled:opacity-40"
              style={{ color: "var(--th-text-muted)" }}
            >
              {tr("초안 되돌리기", "Revert Draft")}
            </button>
            <button
              onClick={() => {
                void handleSave();
              }}
              disabled={!hasChanges || loading || saving || deleting}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40"
            >
              {saving ? tr("저장 중...", "Saving...") : tr("저장", "Save")}
            </button>
            <button
              onClick={() => {
                void handleDelete();
              }}
              disabled={deleting || saving || loading || !savedContent}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-red-500/15 hover:text-red-400 disabled:opacity-40"
              style={{ border: "1px solid var(--th-input-border)", color: "var(--th-text-muted)" }}
            >
              {deleting ? tr("삭제 중...", "Clearing...") : tr("지시문 삭제", "Clear")}
            </button>
          </div>
        </div>

        {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
      </div>
    </div>
  );
}