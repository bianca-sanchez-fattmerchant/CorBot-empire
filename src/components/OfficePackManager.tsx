import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import type { CompanySettings, WorkflowPackKey } from "../types";
import { listOfficePackOptions, normalizeOfficeWorkflowPack } from "../app/office-workflow-pack";

interface OfficePackManagerProps {
  settings: CompanySettings;
  activeOfficeWorkflowPack: WorkflowPackKey;
  onChangeOfficeWorkflowPack: (packKey: WorkflowPackKey) => void;
  onRenameOfficePack: (packKey: WorkflowPackKey, nextName: string) => Promise<void>;
  onDeleteOfficePack: (packKey: WorkflowPackKey) => Promise<void>;
  onOpenAgentsForPack?: (packKey: WorkflowPackKey) => void;
}

export default function OfficePackManager({
  settings,
  activeOfficeWorkflowPack,
  onChangeOfficeWorkflowPack,
  onRenameOfficePack,
  onDeleteOfficePack,
  onOpenAgentsForPack,
}: OfficePackManagerProps) {
  const { t, locale } = useI18n();
  const uiLanguage = locale === "ko" || locale === "ja" || locale === "zh" ? locale : "en";
  const tr = (ko: string, en: string, ja = en, zh = en) => t({ ko, en, ja, zh });

  const activePack = normalizeOfficeWorkflowPack(activeOfficeWorkflowPack);
  const options = useMemo(() => listOfficePackOptions(uiLanguage, settings.officePackNames), [settings.officePackNames, uiLanguage]);
  const [nameDrafts, setNameDrafts] = useState<Partial<Record<WorkflowPackKey, string>>>({});
  const [busyPack, setBusyPack] = useState<WorkflowPackKey | null>(null);

  useEffect(() => {
    setNameDrafts(settings.officePackNames ?? {});
  }, [settings.officePackNames]);

  const hydratedSet = useMemo(
    () =>
      new Set(
        Array.isArray(settings.officePackHydratedPacks)
          ? settings.officePackHydratedPacks.map((value) => String(value ?? "").trim())
          : [],
      ),
    [settings.officePackHydratedPacks],
  );

  return (
    <section className="space-y-4">
      <div
        className="rounded-xl p-4"
        style={{ background: "var(--th-card-bg)", border: "1px solid var(--th-card-border)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--th-text-heading)" }}>
          {tr("오피스 팩 관리", "Manage Office Packs", "オフィスパック管理", "管理办公室包")}
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--th-text-muted)" }}>
          {tr(
            "팩을 선택해 오피스 구조를 전환하고, 각 팩의 프로필 상태를 확인할 수 있습니다.",
            "Select a pack to switch your office structure and inspect each pack profile status.",
            "パックを選択してオフィス構成を切り替え、各パックのプロファイル状態を確認できます。",
            "选择包以切换办公室结构，并查看各包的配置状态。",
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {options.map((option) => {
          const key = option.key;
          const isActive = key === activePack;
          const isBusy = busyPack === key;
          const profile = settings.officePackProfiles?.[key];
          const deptCount = profile?.departments?.length ?? 0;
          const agentCount = profile?.agents?.length ?? 0;
          const hydrated = hydratedSet.has(key);
          const customName = nameDrafts[key] ?? "";

          return (
            <article
              key={key}
              className="rounded-xl p-4"
              style={{
                background: "var(--th-card-bg)",
                border: isActive ? "1px solid rgba(59,130,246,0.65)" : "1px solid var(--th-card-border)",
                boxShadow: isActive ? "0 0 0 1px rgba(59,130,246,0.2) inset" : "none",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold tracking-wide" style={{ color: "var(--th-text-muted)" }}>
                    {option.slug}
                  </div>
                  <h3 className="truncate text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
                    {option.label}
                  </h3>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    color: isActive ? "#bfdbfe" : "var(--th-text-muted)",
                    background: isActive ? "rgba(37,99,235,0.25)" : "var(--th-bg-surface)",
                  }}
                >
                  {isActive ? tr("활성", "Active", "有効", "已启用") : tr("대기", "Inactive", "待機", "未启用")}
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--th-text-muted)" }}>
                {option.summary}
              </p>

              <div className="mt-3 space-y-1.5">
                <label className="block text-[10px] uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
                  {tr("팩 이름", "Pack Name", "パック名", "包名称")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={(event) => {
                      const value = event.target.value;
                      setNameDrafts((prev) => ({ ...prev, [key]: value }));
                    }}
                    placeholder={tr("기본 이름 사용", "Use default name", "デフォルト名を使用", "使用默认名称")}
                    className="w-full rounded-md px-2 py-1.5 text-xs focus:outline-none"
                    style={{
                      border: "1px solid var(--th-border)",
                      background: "var(--th-bg-surface)",
                      color: "var(--th-text-primary)",
                    }}
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      setBusyPack(key);
                      try {
                        await onRenameOfficePack(key, customName);
                      } finally {
                        setBusyPack((prev) => (prev === key ? null : prev));
                      }
                    }}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium transition hover:opacity-90"
                    style={{
                      border: "1px solid var(--th-border)",
                      background: "var(--th-bg-surface)",
                      color: "var(--th-text-primary)",
                    }}
                    disabled={isBusy}
                  >
                    {isBusy ? tr("저장중", "Saving", "保存中", "保存中") : tr("이름 저장", "Save Name", "名前を保存", "保存名称")}
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md px-2 py-1" style={{ background: "var(--th-bg-surface)" }}>
                  <div style={{ color: "var(--th-text-muted)" }}>{tr("부서", "Dept", "部署", "部门")}</div>
                  <div className="font-semibold" style={{ color: "var(--th-text-heading)" }}>
                    {deptCount}
                  </div>
                </div>
                <div className="rounded-md px-2 py-1" style={{ background: "var(--th-bg-surface)" }}>
                  <div style={{ color: "var(--th-text-muted)" }}>{tr("직원", "Agents", "エージェント", "员工")}</div>
                  <div className="font-semibold" style={{ color: "var(--th-text-heading)" }}>
                    {agentCount}
                  </div>
                </div>
                <div className="rounded-md px-2 py-1" style={{ background: "var(--th-bg-surface)" }}>
                  <div style={{ color: "var(--th-text-muted)" }}>{tr("DB", "DB", "DB", "DB")}</div>
                  <div className="font-semibold" style={{ color: hydrated ? "#86efac" : "#fca5a5" }}>
                    {hydrated ? tr("연결", "Linked", "連携", "已连接") : tr("로컬", "Local", "ローカル", "本地")}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChangeOfficeWorkflowPack(key)}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium transition hover:opacity-90"
                  style={{
                    border: "1px solid var(--th-border)",
                    background: isActive ? "rgba(37,99,235,0.28)" : "var(--th-bg-surface)",
                    color: isActive ? "#dbeafe" : "var(--th-text-primary)",
                  }}
                >
                  {isActive
                    ? tr("현재 팩", "Current Pack", "現在のパック", "当前包")
                    : tr("이 팩 사용", "Use This Pack", "このパックを使用", "使用此包")}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAgentsForPack?.(key)}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium transition hover:opacity-90"
                  style={{
                    border: "1px solid var(--th-border)",
                    background: "var(--th-bg-surface)",
                    color: "var(--th-text-primary)",
                  }}
                >
                  {tr("직원 관리", "Manage Agents", "エージェント管理", "管理员工")}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (key === "development") {
                      window.alert(
                        tr(
                          "기본 개발 오피스 팩은 삭제할 수 없습니다.",
                          "The default Development Office pack cannot be deleted.",
                          "デフォルトの開発オフィスパックは削除できません。",
                          "默认开发办公室包无法删除。",
                        ),
                      );
                      return;
                    }
                    const confirmed = window.confirm(
                      tr(
                        "이 오피스 팩을 삭제하면 해당 팩의 직원도 함께 삭제됩니다. 계속할까요?",
                        "Deleting this office pack will also delete its agents. Continue?",
                        "このオフィスパックを削除すると、所属エージェントも削除されます。続行しますか？",
                        "删除此办公室包将同时删除其员工。是否继续？",
                      ),
                    );
                    if (!confirmed) return;
                    setBusyPack(key);
                    try {
                      await onDeleteOfficePack(key);
                    } finally {
                      setBusyPack((prev) => (prev === key ? null : prev));
                    }
                  }}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium transition hover:opacity-90"
                  style={{
                    border: "1px solid rgba(239,68,68,0.45)",
                    background: "rgba(239,68,68,0.12)",
                    color: "#fecaca",
                  }}
                  disabled={isBusy}
                >
                  {isBusy ? tr("삭제중", "Deleting", "削除中", "删除中") : tr("팩 삭제", "Delete Pack", "パック削除", "删除包")}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
