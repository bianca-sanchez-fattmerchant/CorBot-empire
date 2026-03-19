import type { ProjectDecisionEventItem } from "../../api";
import type { ProjectI18nTranslate } from "./types";

export function fmtTime(ts: number | null | undefined): string {
  if (!ts) return "-";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

export function getDecisionEventLabel(
  eventType: ProjectDecisionEventItem["event_type"],
  t: ProjectI18nTranslate,
): string {
  switch (eventType) {
    case "planning_summary":
      return t({ ko: "Planning Summary", en: "Planning Summary", ja: "企画要約", zh: "规划摘要" });
    case "representative_pick":
      return t({ ko: "Representative Pick", en: "Representative Pick", ja: "代表選択", zh: "代表选择" });
    case "followup_request":
      return t({ ko: "Follow-up Request", en: "Follow-up Request", ja: "追加依頼", zh: "追加请求" });
    case "start_review_meeting":
      return t({ ko: "Review Meeting Started", en: "Review Meeting Started", ja: "レビュー会議開始", zh: "评审会议开始" });
    default:
      return eventType;
  }
}
