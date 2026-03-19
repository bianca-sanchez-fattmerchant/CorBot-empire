import type { Agent, Department, OfficePackProfile, WorkflowPackKey } from "../../types";

export type Translator = (ko: string, en: string) => string;

export type AgentUpdatePayload = Partial<
  Pick<
    Agent,
    | "name"
    | "name_ko"
    | "name_ja"
    | "name_zh"
    | "status"
    | "current_task_id"
    | "department_id"
    | "role"
    | "acts_as_planning_leader"
    | "cli_provider"
    | "oauth_account_id"
    | "api_provider_id"
    | "api_model"
    | "cli_model"
    | "cli_reasoning_level"
    | "avatar_emoji"
    | "sprite_number"
    | "personality"
  >
> & {
  workflow_pack_key?: WorkflowPackKey;
  force_planning_leader_override?: boolean;
};

export interface AgentManagerProps {
  agents: Agent[];
  departments: Department[];
  onAgentsChange: () => void;
  activeOfficeWorkflowPack: WorkflowPackKey;
  dbBackedOfficePack?: boolean;
  onSaveOfficePackProfile: (packKey: WorkflowPackKey, profile: OfficePackProfile) => Promise<void>;
}

export interface FormData {
  name: string;
  name_ko: string;
  name_ja: string;
  name_zh: string;
  department_id: string;
  role: import("../../types").AgentRole;
  cli_provider: import("../../types").CliProvider;
  avatar_emoji: string;
  sprite_number: number | null;
  personality: string;
}

export interface DeptForm {
  id: string;
  name: string;
  name_ko: string;
  name_ja: string;
  name_zh: string;
  icon: string;
  color: string;
  description: string;
  prompt: string;
}
