import { useMemo, useState } from "react";
import * as api from "../api";
import { useI18n } from "../i18n";
import type { AgentRole, CliStatusMap, CompanySettings, Department } from "../types";

type TemplateKey = "operator" | "analyst" | "builder";

type AgentTemplate = {
  key: TemplateKey;
  name: string;
  role: AgentRole;
  personality: string;
  avatar: string;
};

type OnboardingResult = {
  companyName: string;
  officePackName: string;
  provider: "claude" | "gemini";
};

type Props = {
  settings: CompanySettings;
  mode: "required" | "optional";
  onCancelOptional: () => void;
  onCompleted: (result: OnboardingResult) => Promise<void>;
};

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    key: "operator",
    name: "Operations Lead",
    role: "team_leader",
    personality: "Delivers clear plans, assigns work, and keeps momentum high.",
    avatar: "⚙",
  },
  {
    key: "analyst",
    name: "Research Analyst",
    role: "senior",
    personality: "Breaks down ambiguous requests and turns them into practical next steps.",
    avatar: "◈",
  },
  {
    key: "builder",
    name: "Execution Builder",
    role: "junior",
    personality: "Implements quickly in small slices and reports progress clearly.",
    avatar: "▲",
  },
];

function toDepartmentId(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const fallback = base.length > 0 ? base : "department";
  return `${fallback}-${Date.now().toString(36).slice(-6)}`;
}

function roleExplanation(role: AgentRole): Record<"ko" | "en" | "ja" | "zh", string> {
  switch (role) {
    case "team_leader":
      return {
        ko: "Leader: 목표를 정하고 우선순위를 관리하며 팀 결정을 책임집니다.",
        en: "Leader: Sets goals, prioritizes work, and owns team-level decisions.",
        ja: "Leader: 目標設定と優先順位管理を行い、チーム判断に責任を持ちます。",
        zh: "Leader: 设定目标与优先级，并对团队层面的决策负责。",
      };
    case "senior":
      return {
        ko: "Senior: 핵심 설계/검토를 담당하고 복잡한 문제를 해결합니다.",
        en: "Senior: Owns key design and reviews, and solves complex problems.",
        ja: "Senior: 重要な設計・レビューを担当し、複雑な課題を解決します。",
        zh: "Senior: 负责关键设计与评审，并解决复杂问题。",
      };
    case "junior":
      return {
        ko: "Junior: 명확한 범위의 실행을 빠르게 처리하고 결과를 공유합니다.",
        en: "Junior: Executes well-defined tasks quickly and reports outcomes.",
        ja: "Junior: 明確な範囲の実装を素早く進め、結果を共有します。",
        zh: "Junior: 快速执行范围明确的任务并反馈结果。",
      };
    case "intern":
      return {
        ko: "Intern: 작은 단위 작업과 자료 수집을 맡고 학습 중심으로 성장합니다.",
        en: "Intern: Handles small scoped tasks and research while learning.",
        ja: "Intern: 小さなタスクと調査を担当し、学習を通じて成長します。",
        zh: "Intern: 承担小范围任务与资料收集，并在实践中学习成长。",
      };
  }
}

export default function FirstRunOnboarding({ settings, mode, onCancelOptional, onCompleted }: Props) {
  const { t } = useI18n(settings.language);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baselinePrepared, setBaselinePrepared] = useState(false);

  const [companyName, setCompanyName] = useState(settings.companyName || "");
  const [officePackName, setOfficePackName] = useState("My Office Pack");
  const [provider, setProvider] = useState<"claude" | "gemini">(
    settings.defaultProvider === "gemini" ? "gemini" : "claude",
  );
  const [cliStatus, setCliStatus] = useState<CliStatusMap | null>(null);

  const [departmentName, setDepartmentName] = useState("Core Team");
  const [departmentIcon, setDepartmentIcon] = useState("◉");
  const [departmentColor, setDepartmentColor] = useState("#3b82f6");
  const [createdDepartment, setCreatedDepartment] = useState<Department | null>(null);

  const [templateKey, setTemplateKey] = useState<TemplateKey>("operator");
  const [firstAgentName, setFirstAgentName] = useState("First Agent");
  const [firstAgentRole, setFirstAgentRole] = useState<AgentRole>("team_leader");
  const [firstAgentPersonality, setFirstAgentPersonality] = useState(
    "Coordinates work and keeps execution focused.",
  );
  const [agentCreated, setAgentCreated] = useState(false);

  const selectedTemplate = useMemo(
    () => AGENT_TEMPLATES.find((tpl) => tpl.key === templateKey) ?? AGENT_TEMPLATES[0],
    [templateKey],
  );

  const providerReady =
    cliStatus &&
    provider in cliStatus &&
    cliStatus[provider].installed === true &&
    cliStatus[provider].authenticated === true;

  const roleText = t(roleExplanation(firstAgentRole));

  const refreshCliStatus = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await api.getCliStatus(true);
      setCliStatus(next);
    } catch (e) {
      console.error(e);
      setError(
        t({
          ko: "CLI 상태를 확인하지 못했습니다.",
          en: "Failed to check CLI status.",
          ja: "CLI 状態を確認できませんでした。",
          zh: "无法检查 CLI 状态。",
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const prepareZeroAgentBaseline = async () => {
    if (baselinePrepared) return true;
    setBusy(true);
    setError(null);
    try {
      await api.saveSettingsPatch({
        officeWorkflowPack: "development",
        officePackProfiles: {},
        officePackHydratedPacks: [],
      });

      const allAgents = await api.getAgents({ includeSeed: true });
      const failedDeletes: string[] = [];
      for (const agent of allAgents) {
        try {
          await api.deleteAgent(agent.id);
        } catch {
          failedDeletes.push(agent.name || agent.id);
        }
      }

      // Delete seeded departments so only user-created departments appear after onboarding
      const seededDepartmentIds = ["planning", "dev", "design", "qa", "devsecops", "operations"];
      for (const deptId of seededDepartmentIds) {
        try {
          await api.deleteDepartment(deptId);
        } catch {
          // Silently ignore if department doesn't exist
        }
      }

      if (failedDeletes.length > 0) {
        setError(
          t({
            ko: `초기 에이전트 정리에 실패했습니다: ${failedDeletes.slice(0, 3).join(", ")}`,
            en: `Failed to clear preloaded agents: ${failedDeletes.slice(0, 3).join(", ")}`,
            ja: `初期エージェントの整理に失敗しました: ${failedDeletes.slice(0, 3).join(", ")}`,
            zh: `清理预加载代理失败: ${failedDeletes.slice(0, 3).join(", ")}`,
          }),
        );
        return false;
      }

      setBaselinePrepared(true);
      return true;
    } catch (e) {
      console.error(e);
      const detail = api.isApiRequestError(e)
        ? ` (${e.code ?? e.message ?? e.status})`
        : e instanceof Error
          ? ` (${e.message})`
          : "";
      setError(
        t({
          ko: `초기 상태(0명 에이전트) 준비에 실패했습니다.${detail}`,
          en: `Failed to prepare zero-agent baseline.${detail}`,
          ja: `初期状態（エージェント 0 名）の準備に失敗しました。${detail}`,
          zh: `准备零代理初始状态失败。${detail}`,
        }),
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveDepartment = async () => {
    if (createdDepartment) return true;
    const trimmed = departmentName.trim();
    if (!trimmed) {
      setError(
        t({
          ko: "부서 이름을 입력해주세요.",
          en: "Please enter a department name.",
          ja: "部署名を入力してください。",
          zh: "请输入部门名称。",
        }),
      );
      return false;
    }

    setBusy(true);
    setError(null);
    try {
      const created = await api.createDepartment({
        id: toDepartmentId(trimmed),
        name: trimmed,
        name_ko: trimmed,
        name_ja: trimmed,
        name_zh: trimmed,
        icon: departmentIcon.trim() || "◉",
        color: departmentColor,
        workflow_pack_key: "development",
      });
      setCreatedDepartment(created);
      return true;
    } catch (e) {
      console.error(e);
      setError(
        t({
          ko: "부서 생성에 실패했습니다.",
          en: "Failed to create department.",
          ja: "部署の作成に失敗しました。",
          zh: "创建部门失败。",
        }),
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveAgent = async () => {
    if (agentCreated) return true;
    if (!createdDepartment?.id) {
      setError(
        t({
          ko: "먼저 부서를 생성해주세요.",
          en: "Create a department first.",
          ja: "先に部署を作成してください。",
          zh: "请先创建部门。",
        }),
      );
      return false;
    }

    const trimmed = firstAgentName.trim();
    if (!trimmed) {
      setError(
        t({
          ko: "에이전트 이름을 입력해주세요.",
          en: "Please enter an agent name.",
          ja: "エージェント名を入力してください。",
          zh: "请输入代理名称。",
        }),
      );
      return false;
    }

    setBusy(true);
    setError(null);
    try {
      await api.createAgent({
        name: trimmed,
        name_ko: trimmed,
        name_ja: trimmed,
        name_zh: trimmed,
        department_id: createdDepartment.id,
        role: firstAgentRole,
        cli_provider: provider,
        avatar_emoji: selectedTemplate.avatar,
        personality: firstAgentPersonality.trim() || selectedTemplate.personality,
        workflow_pack_key: "development",
      });
      setAgentCreated(true);
      return true;
    } catch (e) {
      console.error(e);
      const detail = api.isApiRequestError(e)
        ? e.code || (typeof e.details === "object" && e.details && "error" in e.details
            ? String((e.details as { error?: unknown }).error ?? "")
            : "")
        : "";
      setError(
        t({
          ko: `첫 에이전트 생성에 실패했습니다.${detail ? ` (${detail})` : ""}`,
          en: `Failed to create your first agent.${detail ? ` (${detail})` : ""}`,
          ja: `最初のエージェント作成に失敗しました。${detail ? ` (${detail})` : ""}`,
          zh: `创建首个代理失败。${detail ? ` (${detail})` : ""}`,
        }),
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const goNext = async () => {
    setError(null);

    if (step === 1) {
      if (!companyName.trim() || !officePackName.trim()) {
        setError(
          t({
            ko: "오피스 이름과 오피스 팩 이름을 입력해주세요.",
            en: "Please enter both office name and office pack name.",
            ja: "オフィス名とオフィスパック名を入力してください。",
            zh: "请输入办公室名称和办公室包名称。",
          }),
        );
        return;
      }
      const baselineReady = await prepareZeroAgentBaseline();
      if (!baselineReady) return;
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!providerReady) {
        setError(
          t({
            ko: "선택한 프로바이더 인증이 필요합니다. 상태를 새로고침하세요.",
            en: "Selected provider must be authenticated. Refresh provider status.",
            ja: "選択したプロバイダの認証が必要です。状態を再確認してください。",
            zh: "所选提供方需要认证，请刷新状态后继续。",
          }),
        );
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      const ok = await saveDepartment();
      if (ok) setStep(4);
      return;
    }

    if (step === 4) {
      const ok = await saveAgent();
      if (ok) setStep(5);
      return;
    }

    if (step === 5) {
      setBusy(true);
      try {
        await onCompleted({ companyName: companyName.trim(), officePackName: officePackName.trim(), provider });
      } catch (e) {
        console.error(e);
        setError(
          t({
            ko: "온보딩 완료 처리에 실패했습니다.",
            en: "Failed to complete onboarding.",
            ja: "オンボーディングの完了処理に失敗しました。",
            zh: "完成引导失败。",
          }),
        );
      } finally {
        setBusy(false);
      }
    }
  };

  const stepTitle =
    step === 1
      ? t({ ko: "Office Setup", en: "Office Setup", ja: "オフィス設定", zh: "办公室设置" })
      : step === 2
        ? t({ ko: "AI Provider Setup", en: "AI Provider Setup", ja: "AI プロバイダ設定", zh: "AI 提供方设置" })
        : step === 3
          ? t({ ko: "Create First Department", en: "Create First Department", ja: "最初の部署作成", zh: "创建首个部门" })
          : step === 4
            ? t({ ko: "Create First Agent", en: "Create First Agent", ja: "最初のエージェント作成", zh: "创建首个代理" })
            : t({ ko: "Review & Finish", en: "Review & Finish", ja: "確認して完了", zh: "确认并完成" });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(2, 6, 23, 0.8)" }}>
      <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{stepTitle}</h2>
            <p className="text-xs text-slate-400 mt-1">
              {t({
                ko: "초기 설정을 완료하면 깔끔한 상태에서 바로 시작할 수 있습니다.",
                en: "Finish initial setup once, then start from a clean and understandable workspace.",
                ja: "初期設定を完了すると、分かりやすくクリーンな状態で開始できます。",
                zh: "完成初始设置后，可在清晰整洁的工作区中开始使用。",
              })}
            </p>
          </div>
          {mode === "optional" && (
            <button
              type="button"
              onClick={onCancelOptional}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              {t({ ko: "Later", en: "Later", ja: "後で", zh: "稍后" })}
            </button>
          )}
        </div>

        <div className="mt-4 h-1 w-full rounded-full bg-slate-800">
          <div className="h-1 rounded-full bg-blue-500 transition-all" style={{ width: `${(step / 5) * 100}%` }} />
        </div>

        <div className="mt-5 space-y-4">
          {step === 1 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-slate-300">{t({ ko: "Office Name", en: "Office Name", ja: "オフィス名", zh: "办公室名称" })}</span>
                <input
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-300">{t({ ko: "Office Pack Name", en: "Office Pack Name", ja: "オフィスパック名", zh: "办公室包名称" })}</span>
                <input
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                  value={officePackName}
                  onChange={(e) => setOfficePackName(e.target.value)}
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(["claude", "gemini"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    className={`rounded-lg border px-3 py-2 text-sm text-left ${provider === p ? "border-blue-500 bg-blue-500/10" : "border-slate-600 bg-slate-800"}`}
                  >
                    <div className="font-medium">{p === "claude" ? "Claude" : "Gemini"}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {p === "claude"
                        ? t({ ko: "Use Claude CLI.", en: "Use Claude CLI.", ja: "Claude CLI を使用します。", zh: "使用 Claude CLI。" })
                        : t({ ko: "Use Gemini CLI.", en: "Use Gemini CLI.", ja: "Gemini CLI を使用します。", zh: "使用 Gemini CLI。" })}
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-3 text-xs text-slate-300 space-y-1">
                <p>{t({ ko: "Authentication check", en: "Authentication check", ja: "認証チェック", zh: "认证检查" })}</p>
                <p>{t({ ko: "1) Complete CLI login for your selected provider", en: "1) Complete CLI login for your selected provider", ja: "1) 選択した CLI のログイン完了", zh: "1) 完成所选 CLI 登录" })}</p>
                <p>{t({ ko: "2) Click Refresh Status", en: "2) Click Refresh Status", ja: "2) 状態更新ボタンをクリック", zh: "2) 点击刷新状态" })}</p>
                <p>{t({ ko: "3) Continue only when both installed and authenticated are true", en: "3) Continue only when both installed and authenticated are true", ja: "3) installed と authenticated の両方が true の場合のみ続行", zh: "3) installed 与 authenticated 均为 true 才可继续" })}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void refreshCliStatus();
                  }}
                  disabled={busy}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {t({ ko: "Refresh Status", en: "Refresh Status", ja: "状態更新", zh: "刷新状态" })}
                </button>
                <span className={`text-xs ${providerReady ? "text-emerald-300" : "text-amber-300"}`}>
                  {providerReady
                    ? t({ ko: "Provider authenticated", en: "Provider authenticated", ja: "認証済み", zh: "已认证" })
                    : t({ ko: "Authentication required", en: "Authentication required", ja: "認証が必要", zh: "需要认证" })}
                </span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-slate-300">{t({ ko: "Department Name", en: "Department Name", ja: "部署名", zh: "部门名称" })}</span>
                <input
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-300">{t({ ko: "Icon", en: "Icon", ja: "アイコン", zh: "图标" })}</span>
                <input
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                  value={departmentIcon}
                  onChange={(e) => setDepartmentIcon(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-3">
                <span className="text-slate-300">{t({ ko: "Color", en: "Color", ja: "カラー", zh: "颜色" })}</span>
                <input
                  type="color"
                  className="h-10 w-28 rounded-lg border border-slate-600 bg-slate-800 px-2"
                  value={departmentColor}
                  onChange={(e) => setDepartmentColor(e.target.value)}
                />
              </label>
              {createdDepartment && (
                <div className="sm:col-span-3 rounded-lg border border-emerald-700 bg-emerald-900/20 p-2 text-xs text-emerald-200">
                  {t({ ko: "Department created.", en: "Department created.", ja: "部署を作成しました。", zh: "部门已创建。" })}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">{t({ ko: "Choose an Agent Template", en: "Choose an Agent Template", ja: "テンプレート選択", zh: "选择代理模板" })}</h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {AGENT_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => {
                        setTemplateKey(tpl.key);
                        setFirstAgentName(tpl.name);
                        setFirstAgentRole(tpl.role);
                        setFirstAgentPersonality(tpl.personality);
                      }}
                      className={`rounded-lg border px-3 py-2 text-left ${templateKey === tpl.key ? "border-blue-500 bg-blue-500/10" : "border-slate-600 bg-slate-800"}`}
                    >
                      <div className="text-sm font-medium">{tpl.name}</div>
                      <div className="text-xs text-slate-400 mt-1">{tpl.role}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-300">{t({ ko: "Agent Name", en: "Agent Name", ja: "エージェント名", zh: "代理名称" })}</span>
                  <input
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                    value={firstAgentName}
                    onChange={(e) => setFirstAgentName(e.target.value)}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-300">{t({ ko: "Role", en: "Role", ja: "役割", zh: "角色" })}</span>
                  <select
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                    value={firstAgentRole}
                    onChange={(e) => setFirstAgentRole(e.target.value as AgentRole)}
                  >
                    <option value="team_leader">Leader</option>
                    <option value="senior">Senior</option>
                    <option value="junior">Junior</option>
                    <option value="intern">Intern</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-slate-300">{t({ ko: "Role Guidance", en: "Role Guidance", ja: "役割ガイダンス", zh: "角色说明" })}</span>
                  <p className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-300">{roleText}</p>
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-slate-300">{t({ ko: "Persona", en: "Persona", ja: "ペルソナ", zh: "个性描述" })}</span>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                    value={firstAgentPersonality}
                    onChange={(e) => setFirstAgentPersonality(e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-3">
                <p><strong>{t({ ko: "Office", en: "Office", ja: "オフィス", zh: "办公室" })}:</strong> {companyName}</p>
                <p><strong>{t({ ko: "Office Pack", en: "Office Pack", ja: "オフィスパック", zh: "办公室包" })}:</strong> {officePackName}</p>
                <p><strong>{t({ ko: "Provider", en: "Provider", ja: "プロバイダ", zh: "提供方" })}:</strong> {provider}</p>
                <p><strong>{t({ ko: "Department", en: "Department", ja: "部署", zh: "部门" })}:</strong> {createdDepartment?.name ?? "-"}</p>
                <p><strong>{t({ ko: "First Agent", en: "First Agent", ja: "最初のエージェント", zh: "首个代理" })}:</strong> {firstAgentName}</p>
              </div>
              <p className="text-xs text-slate-400">
                {t({
                  ko: "완료를 누르면 기본 설정이 저장되고 바로 업무를 시작할 수 있습니다.",
                  en: "Click Finish to save your setup and start working immediately.",
                  ja: "完了を押すと設定が保存され、すぐに作業を開始できます。",
                  zh: "点击完成后将保存配置并可立即开始使用。",
                })}
              </p>
            </div>
          )}
        </div>

        {error && <div className="mt-3 rounded-lg border border-rose-700 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">{error}</div>}

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            disabled={step <= 1 || busy}
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
          >
            {t({ ko: "Back", en: "Back", ja: "戻る", zh: "上一步" })}
          </button>

          <button
            type="button"
            onClick={() => {
              void goNext();
            }}
            disabled={busy}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {step === 5
              ? t({ ko: "Finish", en: "Finish", ja: "完了", zh: "完成" })
              : t({ ko: "Next", en: "Next", ja: "次へ", zh: "下一步" })}
          </button>
        </div>
      </div>
    </div>
  );
}
