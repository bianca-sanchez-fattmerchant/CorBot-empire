import type { LangText } from "../../i18n";

export interface StreamingMessage {
  message_id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  content: string;
}

export type ChatMode = "chat" | "task" | "announcement" | "report";

export type ProjectMetaPayload = {
  project_id?: string;
  project_path?: string;
  project_context?: string;
};

export type PendingSendAction =
  | { kind: "directive"; content: string }
  | { kind: "announcement"; content: string }
  | { kind: "task"; content: string; receiverId: string }
  | { kind: "report"; content: string; receiverId: string }
  | { kind: "chat"; content: string; receiverId: string }
  | { kind: "broadcast"; content: string };

export const STATUS_COLORS: Record<string, string> = {
  idle: "bg-green-400",
  working: "bg-blue-400",
  break: "bg-yellow-400",
  offline: "bg-gray-500",
};

export const STATUS_LABELS: Record<string, LangText> = {
  idle: { ko: "Idle", en: "Idle", ja: "待機中", zh: "待机中" },
  working: { ko: "Working", en: "Working", ja: "作業中", zh: "工作中" },
  break: { ko: "Break", en: "Break", ja: "休憩中", zh: "休息中" },
  offline: { ko: "Offline", en: "Offline", ja: "オフライン", zh: "离线" },
};

export const ROLE_LABELS: Record<string, LangText> = {
  team_leader: { ko: "Team Leader", en: "Team Leader", ja: "チームリーダー", zh: "组长" },
  senior: { ko: "Senior", en: "Senior", ja: "シニア", zh: "高级" },
  junior: { ko: "Junior", en: "Junior", ja: "ジュニア", zh: "初级" },
  intern: { ko: "Intern", en: "Intern", ja: "インターン", zh: "实习生" },
};

export function isPromiseLike(value: unknown): value is Promise<void> {
  return !!value && typeof (value as { then?: unknown }).then === "function";
}
