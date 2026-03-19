import type { Agent, Department } from "../../types";
import { localeName } from "../../i18n";
import AgentAvatar from "../AgentAvatar";
import { CLI_PROVIDERS, ROLES, ROLE_LABEL, STATUS_DOT } from "./constants";
import type { Translator } from "./types";

interface AgentTableViewProps {
  tr: Translator;
  locale: string;
  isKo: boolean;
  agents: Agent[];
  departments: Department[];
  sortedAgents: Agent[];
  spriteMap: Map<string, number>;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (agentId: string) => void;
  onUpdateAgent: (agentId: string, updates: Partial<Agent>) => Promise<void>;
  saving: boolean;
}

export default function AgentTableView({
  tr,
  locale,
  isKo,
  departments,
  sortedAgents,
  spriteMap,
  confirmDeleteId,
  setConfirmDeleteId,
  onEditAgent,
  onDeleteAgent,
  onUpdateAgent,
  saving,
}: AgentTableViewProps) {
  const handleDepartmentChange = async (agentId: string, departmentId: string) => {
    await onUpdateAgent(agentId, { department_id: departmentId || null });
  };

  const handleRoleChange = async (agentId: string, role: Agent["role"]) => {
    await onUpdateAgent(agentId, { role });
  };

  const handleProviderChange = async (agentId: string, cliProvider: Agent["cli_provider"]) => {
    await onUpdateAgent(agentId, { cli_provider: cliProvider });
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--th-card-bg)", border: "1px solid var(--th-card-border)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-xs font-medium"
              style={{ background: "var(--th-bg-surface)", color: "var(--th-text-muted)" }}
            >
              <th className="text-left px-4 py-3">{tr("직원", "Agent")}</th>
              <th className="text-left px-4 py-3">{tr("부서", "Department")}</th>
              <th className="text-left px-4 py-3">{tr("역할", "Role")}</th>
              <th className="text-left px-4 py-3">{tr("모델", "Model")}</th>
              <th className="text-left px-4 py-3">{tr("상태", "Status")}</th>
              <th className="text-left px-4 py-3">{tr("성격", "Personality")}</th>
              <th className="text-right px-4 py-3">{tr("작업", "Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedAgents.map((agent, index) => {
              const isDeleting = confirmDeleteId === agent.id;
              const dept = departments.find((d) => d.id === agent.department_id);

              return (
                <tr
                  key={agent.id}
                  className="group hover:bg-white/5 transition-colors"
                  style={{
                    borderTop: index === 0 ? undefined : "1px solid var(--th-card-border)",
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <AgentAvatar agent={agent} spriteMap={spriteMap} size={36} rounded="lg" />
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${STATUS_DOT[agent.status] ?? STATUS_DOT.idle}`}
                          style={{ borderColor: "var(--th-card-bg)" }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate" style={{ color: "var(--th-text-heading)" }}>
                          {localeName(locale, agent)}
                        </div>
                        <div className="text-[10px] truncate" style={{ color: "var(--th-text-muted)" }}>
                          {(() => {
                            const primary = localeName(locale, agent);
                            const sub = locale === "en" ? agent.name_ko || "" : agent.name;
                            return primary !== sub ? sub : "";
                          })()}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={agent.department_id || ""}
                      onChange={(e) => handleDepartmentChange(agent.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={saving}
                      className="w-full text-xs px-2 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow disabled:opacity-50 cursor-pointer"
                      style={{
                        background: "var(--th-input-bg)",
                        border: "1px solid var(--th-input-border)",
                        color: "var(--th-text-primary)",
                      }}
                    >
                      <option value="">{tr("없음", "None")}</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.icon} {localeName(locale, department)}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={agent.role}
                      onChange={(e) => handleRoleChange(agent.id, e.target.value as Agent["role"])}
                      onClick={(e) => e.stopPropagation()}
                      disabled={saving}
                      className="w-full text-xs px-2 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow disabled:opacity-50 cursor-pointer"
                      style={{
                        background: "var(--th-input-bg)",
                        border: "1px solid var(--th-input-border)",
                        color: "var(--th-text-primary)",
                      }}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {isKo ? ROLE_LABEL[role]?.ko : ROLE_LABEL[role]?.en}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={agent.cli_provider}
                      onChange={(e) => handleProviderChange(agent.id, e.target.value as Agent["cli_provider"])}
                      onClick={(e) => e.stopPropagation()}
                      disabled={saving}
                      className="w-full text-xs px-2 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow disabled:opacity-50 cursor-pointer font-mono"
                      style={{
                        background: "var(--th-input-bg)",
                        border: "1px solid var(--th-input-border)",
                        color: "var(--th-text-primary)",
                      }}
                    >
                      {CLI_PROVIDERS.map((provider) => (
                        <option key={provider} value={provider}>
                          {provider}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${STATUS_DOT[agent.status] ?? STATUS_DOT.idle}`}
                      />
                      <span className="text-xs capitalize" style={{ color: "var(--th-text-muted)" }}>
                        {agent.status}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div
                      className="text-xs truncate max-w-[150px]"
                      style={{ color: "var(--th-text-muted)" }}
                      title={agent.personality || ""}
                    >
                      {agent.personality || "-"}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAgent(agent);
                        }}
                        className="px-2 py-1 rounded text-xs transition-colors opacity-0 group-hover:opacity-100"
                        style={{
                          color: "var(--th-text-muted)",
                          background: "var(--th-bg-surface)",
                        }}
                        title={tr("편집", "Edit")}
                      >
                        ✏️
                      </button>
                      {isDeleting ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteAgent(agent.id);
                            }}
                            disabled={saving || agent.status === "working"}
                            className="px-2 py-1 rounded text-xs font-medium bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 transition-colors"
                          >
                            {tr("해고", "Fire")}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 rounded text-xs transition-colors"
                            style={{ color: "var(--th-text-muted)" }}
                          >
                            {tr("취소", "No")}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(agent.id);
                          }}
                          className="px-2 py-1 rounded text-xs hover:bg-red-500/15 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          style={{ color: "var(--th-text-muted)" }}
                          title={tr("해고", "Fire")}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedAgents.length === 0 && (
        <div className="text-center py-16" style={{ color: "var(--th-text-muted)" }}>
          <div className="text-3xl mb-2">🔍</div>
          {tr("검색 결과 없음", "No agents found")}
        </div>
      )}
    </div>
  );
}
