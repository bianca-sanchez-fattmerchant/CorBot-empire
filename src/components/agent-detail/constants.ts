import type { OAuthAccountInfo } from "../../api";
import type { UiLanguage } from "../../i18n";

export type Locale = UiLanguage;
export type TFunction = (messages: Record<Locale, string>) => string;

export function roleLabel(role: string, t: TFunction) {
  switch (role) {
    case "team_leader":
      return t({ ko: "Team Leader", en: "Team Leader", ja: "チームリーダー", zh: "组长" });
    case "senior":
      return t({ ko: "Senior", en: "Senior", ja: "シニア", zh: "高级" });
    case "junior":
      return t({ ko: "Junior", en: "Junior", ja: "ジュニア", zh: "初级" });
    case "intern":
      return t({ ko: "Intern", en: "Intern", ja: "インターン", zh: "实习生" });
    default:
      return role;
  }
}

function hashSubAgentId(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getSubAgentSpriteNum(subAgentId: string): number {
  return (hashSubAgentId(`${subAgentId}:clone`) % 13) + 1;
}

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  idle: { label: "idle", color: "text-green-400", bg: "bg-green-500/20" },
  working: { label: "working", color: "text-blue-400", bg: "bg-blue-500/20" },
  break: { label: "break", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  offline: {
    label: "offline",
    color: "text-slate-400",
    bg: "bg-slate-500/20",
  },
};

export const CLI_LABELS: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex CLI",
  gemini: "Gemini CLI",
  opencode: "OpenCode",
  kimi: "Kimi Code",
  copilot: "GitHub Copilot",
  antigravity: "Antigravity",
  api: "API Provider",
};

export const SUBTASK_STATUS_ICON: Record<string, string> = {
  pending: "\u23F3",
  in_progress: "\uD83D\uDD28",
  done: "\u2705",
  blocked: "\uD83D\uDEAB",
};

export function oauthAccountLabel(account: OAuthAccountInfo): string {
  return account.label || account.email || account.id.slice(0, 8);
}

export function statusLabel(status: string, t: TFunction) {
  switch (status) {
    case "idle":
      return t({ ko: "Idle", en: "Idle", ja: "待機中", zh: "空闲" });
    case "working":
      return t({ ko: "Working", en: "Working", ja: "作業中", zh: "工作中" });
    case "break":
      return t({ ko: "Break", en: "Break", ja: "休憩中", zh: "休息中" });
    case "offline":
      return t({ ko: "Offline", en: "Offline", ja: "オフライン", zh: "离线" });
    default:
      return status;
  }
}

export function taskStatusLabel(status: string, t: TFunction) {
  switch (status) {
    case "inbox":
      return t({ ko: "Inbox", en: "Inbox", ja: "受信箱", zh: "收件箱" });
    case "planned":
      return t({ ko: "Planned", en: "Planned", ja: "計画済み", zh: "已计划" });
    case "in_progress":
      return t({ ko: "In Progress", en: "In Progress", ja: "進行中", zh: "进行中" });
    case "review":
      return t({ ko: "Review", en: "Review", ja: "レビュー", zh: "审核" });
    case "done":
      return t({ ko: "Done", en: "Done", ja: "完了", zh: "完成" });
    case "pending":
      return t({ ko: "Pending", en: "Pending", ja: "保留", zh: "待处理" });
    case "cancelled":
      return t({ ko: "Cancelled", en: "Cancelled", ja: "キャンセル", zh: "已取消" });
    default:
      return status;
  }
}

export function taskTypeLabel(type: string, t: TFunction) {
  switch (type) {
    case "general":
      return t({ ko: "General", en: "General", ja: "一般", zh: "通用" });
    case "development":
      return t({ ko: "Development", en: "Development", ja: "開発", zh: "开发" });
    case "design":
      return t({ ko: "Design", en: "Design", ja: "デザイン", zh: "设计" });
    case "analysis":
      return t({ ko: "Analysis", en: "Analysis", ja: "分析", zh: "分析" });
    case "presentation":
      return t({ ko: "Presentation", en: "Presentation", ja: "プレゼン", zh: "演示" });
    case "documentation":
      return t({ ko: "Documentation", en: "Documentation", ja: "ドキュメント", zh: "文档" });
    default:
      return type;
  }
}
