import { useState } from "react";
import type { Department, Agent, CompanySettings, WorkflowPackKey } from "../types";
import { useI18n, localeName } from "../i18n";
import { listOfficePackOptions, normalizeOfficeWorkflowPack } from "../app/office-workflow-pack";
import type { View } from "../app/types";

interface SidebarProps {
  currentView: View;
  onChangeView: (v: View) => void;
  activeOfficeWorkflowPack?: WorkflowPackKey;
  onChangeOfficeWorkflowPack?: (packKey: WorkflowPackKey) => void;
  onOpenRoomManager?: () => void;
  departments: Department[];
  agents: Agent[];
  settings: CompanySettings;
  connected: boolean;
}

const NAV_ITEMS: { view: View; icon: string; sprite?: string }[] = [
  { view: "office", icon: "🏢" },
  { view: "packs", icon: "🗂️" },
  { view: "agents", icon: "👥", sprite: "/sprites/3-D-1.png" },
  { view: "skills", icon: "📚" },
  { view: "dashboard", icon: "📊" },
  { view: "tasks", icon: "📋" },
  { view: "settings", icon: "⚙️" },
];

export default function Sidebar({
  currentView,
  onChangeView,
  activeOfficeWorkflowPack,
  onChangeOfficeWorkflowPack,
  onOpenRoomManager,
  departments,
  agents,
  settings,
  connected,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { t, locale } = useI18n();
  const workingCount = agents.filter((a) => a.status === "working").length;
  const totalAgents = agents.length;
  const uiLanguage = locale === "ko" || locale === "ja" || locale === "zh" ? locale : "en";
  const officePackOptions = listOfficePackOptions(uiLanguage, settings.officePackNames);
  const officePackValue = normalizeOfficeWorkflowPack(activeOfficeWorkflowPack ?? "development");

  const tr = (ko: string, en: string, ja = en, zh = en) => t({ ko, en, ja, zh });

  const navLabels: Record<View, string> = {
    office: tr("오피스", "Office", "オフィス", "办公室"),
    packs: tr("오피스 팩", "Office Packs", "オフィスパック", "办公室包"),
    agents: tr("직원관리", "Agents", "社員管理", "员工管理"),
    skills: tr("문서고", "Library", "ライブラリ", "文档库"),
    dashboard: tr("대시보드", "Dashboard", "ダッシュボード", "仪表盘"),
    tasks: tr("업무 관리", "Tasks", "タスク管理", "任务管理"),
    settings: tr("설정", "Settings", "設定", "设置"),
  };

  return (
    <aside
      className={`flex h-full flex-col backdrop-blur-sm transition-all duration-300 ${collapsed ? "w-16" : "w-48"}`}
      style={{ background: "var(--th-bg-sidebar)", borderRight: "1px solid var(--th-border)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-3 py-4"
        style={{ borderBottom: "1px solid var(--th-border)", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.06)" }}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 relative overflow-visible">
            <img
              src="/sprites/ceo-lobster.png"
              alt={tr("CEO", "CEO")}
              className="w-8 h-8 object-contain"
              style={{ imageRendering: "pixelated" }}
            />
            <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[10px] leading-none drop-shadow">👑</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-sm font-bold truncate" style={{ color: "var(--th-text-heading)" }}>
                {settings.companyName}
              </div>
              <div className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>
                👑 {settings.ceoName}
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 space-y-0.5 px-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            onClick={() => onChangeView(item.view)}
            className={`sidebar-nav-item ${
              currentView === item.view ? "active font-semibold shadow-sm shadow-blue-500/10" : ""
            }`}
          >
            <span className="text-base shrink-0">
              {item.sprite ? (
                <img
                  src={item.sprite}
                  alt=""
                  className="w-5 h-5 object-cover rounded-full"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                item.icon
              )}
            </span>
            {!collapsed && <span>{navLabels[item.view]}</span>}
          </button>
        ))}

        {!collapsed && onChangeOfficeWorkflowPack && (
          <div className="mt-2 rounded-md px-2 py-2" style={{ border: "1px solid var(--th-border)" }}>
            <label
              htmlFor="sidebar-office-pack-selector"
              className="mb-1 block text-[10px] uppercase tracking-wider"
              style={{ color: "var(--th-text-muted)" }}
            >
              {tr("오피스 팩 관리", "Manage Office Packs", "オフィスパック管理", "管理办公室包")}
            </label>
            <select
              id="sidebar-office-pack-selector"
              value={officePackValue}
              onChange={(event) => onChangeOfficeWorkflowPack(event.target.value as WorkflowPackKey)}
              className="w-full rounded-md px-2 py-1.5 text-xs focus:outline-none"
              style={{
                border: "1px solid var(--th-border)",
                background: "var(--th-bg-surface)",
                color: "var(--th-text-primary)",
              }}
            >
              {officePackOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.slug} · {option.label}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onChangeView("packs")}
                className="w-full rounded-md px-2 py-1.5 text-[11px] font-medium transition hover:opacity-90"
                style={{
                  border: "1px solid var(--th-border)",
                  background: "var(--th-bg-surface)",
                  color: "var(--th-text-primary)",
                }}
              >
                {tr("팩 관리", "Manage", "管理", "管理")}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Department quick stats */}
      {!collapsed && (
        <div className="px-3 py-2" style={{ borderTop: "1px solid var(--th-border)" }}>
          <div
            className="text-[10px] uppercase font-semibold mb-1.5 tracking-wider"
            style={{ color: "var(--th-text-muted)" }}
          >
            {tr("부서 현황", "Department Status", "部門状況", "部门状态")}
          </div>
          {departments.map((d) => {
            const deptAgents = agents.filter((a) => a.department_id === d.id);
            const working = deptAgents.filter((a) => a.status === "working").length;
            return (
              <div
                key={d.id}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs hover:bg-[var(--th-bg-surface-hover)] transition-colors"
                style={{ color: "var(--th-text-secondary)" }}
              >
                <span>{d.icon}</span>
                <span className="flex-1 truncate">{localeName(locale, d)}</span>
                <span className={working > 0 ? "text-blue-400 font-medium" : ""}>
                  {working}/{deptAgents.length}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {!collapsed && onOpenRoomManager && (
        <div className="px-3 pb-2" style={{ borderTop: "1px solid var(--th-border)" }}>
          <button
            type="button"
            onClick={onOpenRoomManager}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition hover:opacity-90"
            style={{
              border: "1px solid var(--th-border)",
              background: "var(--th-bg-surface)",
              color: "var(--th-text-primary)",
            }}
          >
            <span aria-hidden="true">🏢</span>
            <span>{tr("사무실 관리", "Manage Offices", "オフィス管理", "管理办公室")}</span>
          </button>
        </div>
      )}

      {/* Status bar */}
      <div className="px-3 py-2.5" style={{ borderTop: "1px solid var(--th-border)" }}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          {!collapsed && (
            <div className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>
              {connected
                ? tr("연결됨", "Connected", "接続中", "已连接")
                : tr("연결 끊김", "Disconnected", "接続なし", "已断开")}{" "}
              · {workingCount}/{totalAgents} {tr("근무중", "working", "稼働中", "工作中")}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
