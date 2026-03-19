import type { Project } from "../../types";

type ProjectFlowStep = "choose" | "existing" | "new" | "confirm";

type Tr = (ko: string, en: string, ja?: string, zh?: string) => string;

interface ProjectFlowDialogProps {
  open: boolean;
  step: ProjectFlowStep;
  isDirectivePending: boolean;
  pendingContent: string;
  projectLoading: boolean;
  projectItems: Project[];
  selectedProject: Project | null;
  existingProjectInput: string;
  existingProjectError: string;
  newProjectName: string;
  newProjectPath: string;
  newProjectGoal: string;
  projectSaving: boolean;
  canCreateProject: boolean;
  tr: Tr;
  onClose: () => void;
  onChooseExisting: () => void;
  onChooseNew: () => void;
  onBackToChoose: () => void;
  onSelectExistingProject: (project: Project, index: number) => void;
  onExistingProjectInputChange: (value: string) => void;
  onApplyExistingProjectSelection: () => void;
  onNewProjectNameChange: (value: string) => void;
  onNewProjectPathChange: (value: string) => void;
  onNewProjectGoalChange: (value: string) => void;
  onCreateProject: () => void;
  onConfirm: () => void;
}

export default function ProjectFlowDialog({
  open,
  step,
  isDirectivePending,
  pendingContent,
  projectLoading,
  projectItems,
  selectedProject,
  existingProjectInput,
  existingProjectError,
  newProjectName,
  newProjectPath,
  newProjectGoal,
  projectSaving,
  canCreateProject,
  tr,
  onClose,
  onChooseExisting,
  onChooseNew,
  onBackToChoose,
  onSelectExistingProject,
  onExistingProjectInputChange,
  onApplyExistingProjectSelection,
  onNewProjectNameChange,
  onNewProjectPathChange,
  onNewProjectGoalChange,
  onCreateProject,
  onConfirm,
}: ProjectFlowDialogProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">
            {tr("Project Branch", "Project Branch", "Project Branch", "Project Branch")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 px-4 py-4 text-sm">
          {step === "choose" && (
            <>
              <p className="text-slate-200">
                {tr(
                  "기존 프로젝트인가요? 신규 프로젝트인가요?",
                  "Is this an existing project or a new project?",
                  "既存プロジェクトですか？新規プロジェクトですか？",
                  "这是已有项目还是新项目？",
                )}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onChooseExisting}
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500"
                >
                  {tr("Existing Project", "Existing Project", "Existing Project", "Existing Project")}
                </button>
                <button
                  type="button"
                  onClick={onChooseNew}
                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  {tr("New Project", "New Project", "New Project", "New Project")}
                </button>
              </div>
            </>
          )}

          {step === "existing" && (
            <>
              <p className="text-xs text-slate-400">
                {tr(
                  "최근 프로젝트 10개를 보여드립니다. 번호(1-10) 또는 프로젝트명을 입력하세요.",
                  "Showing 10 recent projects. Enter a number (1-10) or project name.",
                  "最新プロジェクト10件を表示します。番号(1-10)またはプロジェクト名を入力してください。",
                  "显示最近 10 个项目。请输入编号(1-10)或项目名称。",
                )}
              </p>
              {projectLoading ? (
                <p className="text-xs text-slate-500">
                  {tr("Loading...", "Loading...", "Loading...", "Loading...")}
                </p>
              ) : projectItems.length === 0 ? (
                <p className="text-xs text-slate-500">
                  {tr("No projects", "No projects", "No projects", "No projects")}
                </p>
              ) : (
                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                  {projectItems.map((project, idx) => (
                    <div key={project.id} className="rounded-lg border border-slate-700 bg-slate-800/60 p-2">
                      <p className="text-xs font-medium text-slate-100">
                        <span className="mr-1 text-blue-300">{idx + 1}.</span>
                        {project.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">{project.project_path}</p>
                      <button
                        type="button"
                        onClick={() => onSelectExistingProject(project, idx)}
                        className="mt-2 rounded bg-blue-700 px-2 py-1 text-[11px] text-white hover:bg-blue-600"
                      >
                        {tr("Select", "Select", "Select", "Select")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={existingProjectInput}
                  onChange={(e) => onExistingProjectInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onApplyExistingProjectSelection();
                    }
                  }}
                  placeholder={tr(
                    "예: 1 또는 프로젝트명",
                    "e.g. 1 or project name",
                    "例: 1 またはプロジェクト名",
                    "例如：1 或项目名",
                  )}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-blue-500"
                />
                {existingProjectError && <p className="text-[11px] text-rose-300">{existingProjectError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onApplyExistingProjectSelection}
                    className="flex-1 rounded bg-blue-700 px-2 py-1.5 text-[11px] text-white hover:bg-blue-600"
                  >
                    {tr("Select from input", "Select from input", "Select from input", "Select from input")}
                  </button>
                  <button
                    type="button"
                    onClick={onBackToChoose}
                    className="rounded border border-slate-700 px-2 py-1.5 text-[11px] text-slate-300"
                  >
                    {tr("Back", "Back", "Back", "Back")}
                  </button>
                </div>
              </div>
            </>
          )}

          {step === "new" && (
            <>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => onNewProjectNameChange(e.target.value)}
                placeholder={tr("Project name", "Project name", "Project name", "Project name")}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
              <input
                type="text"
                value={newProjectPath}
                onChange={(e) => onNewProjectPathChange(e.target.value)}
                placeholder={tr("Project path", "Project path", "Project path", "Project path")}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
              <textarea
                rows={3}
                value={newProjectGoal}
                onChange={(e) => onNewProjectGoalChange(e.target.value)}
                readOnly={isDirectivePending}
                placeholder={tr("Core goal", "Core goal", "Core goal", "Core goal")}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
              {isDirectivePending && (
                <p className="text-[11px] text-slate-400">
                  {tr(
                    "$ 업무지시 내용이 신규 프로젝트의 핵심 목표로 자동 반영됩니다.",
                    "The $ directive text is automatically used as the new project core goal.",
                    "$業務指示の内容が新規プロジェクトのコア目標として自動反映されます。",
                    "$ 指令内容会自动作为新项目核心目标。",
                  )}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCreateProject}
                  disabled={!canCreateProject || projectSaving}
                  className="flex-1 rounded bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
                >
                  {projectSaving
                    ? tr("Creating...", "Creating...", "Creating...", "Creating...")
                    : tr("Create & Select", "Create & Select", "Create & Select", "Create & Select")}
                </button>
                <button
                  type="button"
                  onClick={onBackToChoose}
                  className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-300"
                >
                  {tr("Back", "Back", "Back", "Back")}
                </button>
              </div>
            </>
          )}

          {step === "confirm" && selectedProject && (
            <>
              <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                <p className="text-xs font-semibold text-white">{selectedProject.name}</p>
                <p className="mt-1 text-[11px] text-slate-400">{selectedProject.project_path}</p>
                <p className="mt-1 text-[11px] text-slate-300">{selectedProject.core_goal}</p>
                {selectedProject.assignment_mode === "manual" && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-violet-300">
                    <span className="inline-block h-2 w-2 rounded-full bg-violet-400"></span>
                    {tr(
                      `직접 선택 모드 — 지정된 ${selectedProject.assigned_agent_ids?.length ?? 0}명의 직원이 작업합니다`,
                      `Manual mode — ${selectedProject.assigned_agent_ids?.length ?? 0} assigned agents will work on this`,
                      `手動モード — ${selectedProject.assigned_agent_ids?.length ?? 0}名の指定エージェントが作業します`,
                      `手动模式 — ${selectedProject.assigned_agent_ids?.length ?? 0}名指定员工将执行此任务`,
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-blue-700/40 bg-blue-900/20 p-3 text-[11px] text-blue-100">
                <p className="font-medium">{tr("Round Goal", "Round Goal", "Round Goal", "Round Goal")}</p>
                <p className="mt-1 leading-relaxed">
                  {tr(
                    `프로젝트 핵심목표(${selectedProject.core_goal})를 기준으로 이번 요청(${pendingContent})을 실행 가능한 산출물로 완수`,
                    `Execute this round with project core goal (${selectedProject.core_goal}) and current request (${pendingContent}).`,
                    `プロジェクト目標(${selectedProject.core_goal})と今回依頼(${pendingContent})を基準に実行可能な成果物を完了します。`,
                    `以项目核心目标（${selectedProject.core_goal}）和本次请求（${pendingContent}）为基础完成本轮可执行产出。`,
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onConfirm}
                  className="flex-1 rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500"
                >
                  {tr("Select & Send", "Select & Send", "Select & Send", "Select & Send")}
                </button>
                <button
                  type="button"
                  onClick={onBackToChoose}
                  className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-300"
                >
                  {tr("Re-select", "Re-select", "Re-select", "Re-select")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
