import { type Graphics, type Text, TextStyle } from "pixi.js";
import type { UiLanguage } from "../../i18n";
import type { MeetingReviewDecision } from "../../types";
import type { RoomTheme } from "./model";

const OFFICE_PASTEL_LIGHT = {
  creamWhite: 0xf8f3ec,
  creamDeep: 0xebdfcf,
  softMint: 0xbfded5,
  softMintDeep: 0x8fbcb0,
  dustyRose: 0xd5a5ae,
  dustyRoseDeep: 0xb67d89,
  warmSand: 0xd6b996,
  warmWood: 0xb8906d,
  cocoa: 0x6f4d3a,
  ink: 0x2f2530,
  slate: 0x586378,
};

/* ── Dark (late-night coding session) palette ── */
const OFFICE_PASTEL_DARK = {
  creamWhite: 0x0e1020,
  creamDeep: 0x0c0e1e,
  softMint: 0x122030,
  softMintDeep: 0x0e1a28,
  dustyRose: 0x201020,
  dustyRoseDeep: 0x1a0c1a,
  warmSand: 0x1a1810,
  warmWood: 0x16130c,
  cocoa: 0x140f08,
  ink: 0xc8cee0,
  slate: 0x7888a8,
};

let OFFICE_PASTEL = OFFICE_PASTEL_LIGHT;

const DEFAULT_CEO_THEME_LIGHT: RoomTheme = {
  floor1: 0xe5d9b9,
  floor2: 0xdfd0a8,
  wall: 0x998243,
  accent: 0xa77d0c,
};
const DEFAULT_CEO_THEME_DARK: RoomTheme = {
  floor1: 0x101020,
  floor2: 0x0e0e1c,
  wall: 0x2a2450,
  accent: 0x584818,
};

const DEFAULT_BREAK_THEME_LIGHT: RoomTheme = {
  floor1: 0xf7e2b7,
  floor2: 0xf6dead,
  wall: 0xa99c83,
  accent: 0xf0c878,
};
const DEFAULT_BREAK_THEME_DARK: RoomTheme = {
  floor1: 0x141210,
  floor2: 0x10100e,
  wall: 0x302a20,
  accent: 0x4a3c18,
};

let DEFAULT_CEO_THEME = DEFAULT_CEO_THEME_LIGHT;
let DEFAULT_BREAK_THEME = DEFAULT_BREAK_THEME_LIGHT;

type SupportedLocale = UiLanguage;

const LOCALE_TEXT = {
  ceoOffice: {
    ko: "CEO OFFICE", en: "CEO OFFICE", ja: "CEO OFFICE",
    zh: "CEO办公室",
  },
  collabTable: {
    ko: "6P COLLAB TABLE", en: "6P COLLAB TABLE", ja: "6P COLLAB TABLE",
    zh: "6人协作桌",
  },
  statsEmployees: { ko: "Staff", en: "Staff", ja: "Staff", zh: "员工" },
  statsWorking: { ko: "Working", en: "Working", ja: "Working", zh: "处理中" },
  statsProgress: { ko: "In Progress", en: "In Progress", ja: "In Progress", zh: "进行中" },
  statsDone: { ko: "Done", en: "Done", ja: "Done", zh: "已完成" },
  hint: {
    ko: "WASD/Arrow/Virtual Pad: CEO Move  |  Enter: Interact", en: "WASD/Arrow/Virtual Pad: CEO Move  |  Enter: Interact", ja: "WASD/Arrow/Virtual Pad: CEO Move  |  Enter: Interact",
    zh: "WASD/方向键/虚拟手柄: CEO移动  |  Enter: 交互",
  },
  mobileEnter: {
    ko: "Enter", en: "Enter", ja: "Enter",
    zh: "Enter",
  },
  noAssignedAgent: {
    ko: "No assigned staff", en: "No assigned staff", ja: "No assigned staff",
    zh: "暂无分配员工",
  },
  breakRoom: {
    ko: "☕ Break Room", en: "☕ Break Room", ja: "☕ Break Room",
    zh: "☕ 休息室",
  },
  role: {
    team_leader: { ko: "Lead", en: "Lead", ja: "Lead", zh: "组长" },
    senior: { ko: "Senior", en: "Senior", ja: "Senior", zh: "资深" },
    junior: { ko: "Junior", en: "Junior", ja: "Junior", zh: "初级" },
    intern: { ko: "Intern", en: "Intern", ja: "Intern", zh: "实习" },
    part_time: { ko: "Part-time", en: "Part-time", ja: "Part-time", zh: "兼职" },
  },
  partTime: {
    ko: "Part-time", en: "Part-time", ja: "Part-time",
    zh: "兼职",
  },
  collabBadge: {
    ko: "🤝 Collaboration", en: "🤝 Collaboration", ja: "🤝 Collaboration",
    zh: "🤝 协作",
  },
  meetingBadgeKickoff: {
    ko: "📣 Meeting", en: "📣 Meeting", ja: "📣 Meeting",
    zh: "📣 会议",
  },
  meetingBadgeReviewing: {
    ko: "🔎 Reviewing", en: "🔎 Reviewing", ja: "🔎 Reviewing",
    zh: "🔎 评审中",
  },
  meetingBadgeApproved: {
    ko: "✅ Approval", en: "✅ Approval", ja: "✅ Approval",
    zh: "✅ 审批",
  },
  meetingBadgeHold: {
    ko: "⚠ Hold", en: "⚠ Hold", ja: "⚠ Hold",
    zh: "⚠ 暂缓",
  },
  kickoffLines: {
    ko: [
      "Checking cross-team impact",
      "Sharing risks/dependencies",
      "Aligning schedule/priorities",
      "Defining ownership boundaries",
    ], en: [
      "Checking cross-team impact",
      "Sharing risks/dependencies",
      "Aligning schedule/priorities",
      "Defining ownership boundaries",
    ], ja: [
      "Checking cross-team impact",
      "Sharing risks/dependencies",
      "Aligning schedule/priorities",
      "Defining ownership boundaries",
    ], zh: [
      "Checking cross-team impact",
      "Sharing risks/dependencies",
      "Aligning schedule/priorities",
      "Defining ownership boundaries",
    ],
  },
  reviewLines: {
    ko: [
      "Verifying follow-up updates",
      "Reviewing final approval draft",
      "Sharing revision ideas",
      "Cross-checking deliverables",
    ], en: [
      "Verifying follow-up updates",
      "Reviewing final approval draft",
      "Sharing revision ideas",
      "Cross-checking deliverables",
    ], ja: [
      "Verifying follow-up updates",
      "Reviewing final approval draft",
      "Sharing revision ideas",
      "Cross-checking deliverables",
    ], zh: [
      "Verifying follow-up updates",
      "Reviewing final approval draft",
      "Sharing revision ideas",
      "Cross-checking deliverables",
    ],
  },
  meetingTableHint: {
    ko: "📝 Meeting live: click table for minutes", en: "📝 Meeting live: click table for minutes", ja: "📝 Meeting live: click table for minutes",
    zh: "📝 会议进行中：点击桌子查看纪要",
  },
  cliUsageTitle: {
    ko: "CLI Usage", en: "CLI Usage", ja: "CLI Usage",
    zh: "CLI 使用量",
  },
  cliConnected: {
    ko: "connected", en: "connected", ja: "connected",
    zh: "已连接",
  },
  cliRefreshTitle: {
    ko: "Refresh usage data", en: "Refresh usage data", ja: "Refresh usage data",
    zh: "刷新用量数据",
  },
  cliNotSignedIn: {
    ko: "not signed in", en: "not signed in", ja: "not signed in",
    zh: "未登录",
  },
  cliNoApi: {
    ko: "no usage API", en: "no usage API", ja: "no usage API",
    zh: "无用量 API",
  },
  cliUnavailable: {
    ko: "unavailable", en: "unavailable", ja: "unavailable",
    zh: "不可用",
  },
  cliLoading: {
    ko: "loading...", en: "loading...", ja: "loading...",
    zh: "加载中...",
  },
  cliResets: {
    ko: "resets", en: "resets", ja: "resets",
    zh: "重置剩余",
  },
  cliNoData: {
    ko: "no data", en: "no data", ja: "no data",
    zh: "无数据",
  },
  soon: {
    ko: "soon", en: "soon", ja: "soon",
    zh: "即将",
  },
};

const BREAK_CHAT_MESSAGES: Record<SupportedLocale, string[]> = {
  ko: [
    "One more cup of coffee~",
    "What should we eat for lunch?",
    "So sleepy...",
    "Any weekend plans?",
    "This project is tough lol",
    "Cafe latte wins!",
    "Nice weather today~",
    "I hate overtime...",
    "Craving something tasty",
    "Let's take a short break~",
    "LOL",
    "Snacks are here!",
    "5 more minutes~",
    "Let's go, fighting!",
    "Recharging energy...",
    "I want to go home~",
  ], en: [
    "One more cup of coffee~",
    "What should we eat for lunch?",
    "So sleepy...",
    "Any weekend plans?",
    "This project is tough lol",
    "Cafe latte wins!",
    "Nice weather today~",
    "I hate overtime...",
    "Craving something tasty",
    "Let's take a short break~",
    "LOL",
    "Snacks are here!",
    "5 more minutes~",
    "Let's go, fighting!",
    "Recharging energy...",
    "I want to go home~",
  ], ja: [
    "One more cup of coffee~",
    "What should we eat for lunch?",
    "So sleepy...",
    "Any weekend plans?",
    "This project is tough lol",
    "Cafe latte wins!",
    "Nice weather today~",
    "I hate overtime...",
    "Craving something tasty",
    "Let's take a short break~",
    "LOL",
    "Snacks are here!",
    "5 more minutes~",
    "Let's go, fighting!",
    "Recharging energy...",
    "I want to go home~",
  ], zh: [
    "One more cup of coffee~",
    "What should we eat for lunch?",
    "So sleepy...",
    "Any weekend plans?",
    "This project is tough lol",
    "Cafe latte wins!",
    "Nice weather today~",
    "I hate overtime...",
    "Craving something tasty",
    "Let's take a short break~",
    "LOL",
    "Snacks are here!",
    "5 more minutes~",
    "Let's go, fighting!",
    "Recharging energy...",
    "I want to go home~",
  ],
};

function pickLocale<T>(locale: SupportedLocale, map: Record<SupportedLocale, T>): T {
  return map[locale] ?? map.ko;
}

function inferReviewDecision(line?: string | null): MeetingReviewDecision {
  const cleaned = line?.replace(/\s+/g, " ").trim();
  if (!cleaned) return "reviewing";
  if (/(hold|revise|revision|changes?\s+requested|required|pending|risk|block|missing|incomplete|not\s+ready)/i.test(cleaned)) {
    return "hold";
  }
  if (
    /(승인|통과|문제없|진행.?가능|배포.?가능|approve|approved|lgtm|ship\s+it|go\s+ahead|承認|批准|通过|可发布)/i.test(
      cleaned,
    )
  ) {
    return "approved";
  }
  return "reviewing";
}

function resolveMeetingDecision(
  phase: "kickoff" | "review",
  decision?: MeetingReviewDecision | null,
  line?: string,
): MeetingReviewDecision | undefined {
  if (phase !== "review") return undefined;
  return decision ?? inferReviewDecision(line);
}

function getMeetingBadgeStyle(
  locale: SupportedLocale,
  phase: "kickoff" | "review",
  decision?: MeetingReviewDecision,
): { fill: number; stroke: number; text: string } {
  if (phase !== "review") {
    return {
      fill: 0xf59e0b,
      stroke: 0x111111,
      text: pickLocale(locale, LOCALE_TEXT.meetingBadgeKickoff),
    };
  }

  if (decision === "approved") {
    return {
      fill: 0x34d399,
      stroke: 0x14532d,
      text: pickLocale(locale, LOCALE_TEXT.meetingBadgeApproved),
    };
  }
  if (decision === "hold") {
    return {
      fill: 0xf97316,
      stroke: 0x7c2d12,
      text: pickLocale(locale, LOCALE_TEXT.meetingBadgeHold),
    };
  }
  return {
    fill: 0x60a5fa,
    stroke: 0x1e3a8a,
    text: pickLocale(locale, LOCALE_TEXT.meetingBadgeReviewing),
  };
}

function paintMeetingBadge(
  badge: Graphics,
  badgeText: Text,
  locale: SupportedLocale,
  phase: "kickoff" | "review",
  decision?: MeetingReviewDecision,
): void {
  const style = getMeetingBadgeStyle(locale, phase, decision);
  badge.clear();
  badge.roundRect(-24, 4, 48, 13, 4).fill({ color: style.fill, alpha: 0.9 });
  badge.roundRect(-24, 4, 48, 13, 4).stroke({ width: 1, color: style.stroke, alpha: 0.45 });
  badgeText.text = style.text;
}

// Break spots: positive x = offset from room left; negative x = offset from room right
// These are calibrated to match furniture positions drawn in buildScene
const BREAK_SPOTS = [
  { x: 86, y: 72, dir: "D" }, // 왼쪽 소파 좌측 (sofa at baseX+50, width 80)
  { x: 110, y: 72, dir: "D" }, // 왼쪽 소파 중앙
  { x: 134, y: 72, dir: "D" }, // 왼쪽 소파 우측
  { x: 30, y: 58, dir: "R" }, // 커피머신 앞 (machine at baseX, y+20)
  { x: -112, y: 72, dir: "D" }, // 우측 소파 좌측 (sofa at rightX-120, width 80)
  { x: -82, y: 72, dir: "D" }, // 우측 소파 우측
  { x: -174, y: 56, dir: "L" }, // 하이테이블 왼쪽 (table at rightX-170, width 36)
  { x: -144, y: 56, dir: "R" }, // 하이테이블 오른쪽
];

const DEPT_THEME_LIGHT: Record<string, RoomTheme> = {
  dev: { floor1: 0xd8e8f5, floor2: 0xcce1f2, wall: 0x6c96b7, accent: 0x5a9fd4 },
  design: { floor1: 0xe8def2, floor2: 0xe1d4ee, wall: 0x9378ad, accent: 0x9a6fc4 },
  planning: { floor1: 0xf0e1c5, floor2: 0xeddaba, wall: 0xae9871, accent: 0xd4a85a },
  operations: { floor1: 0xd0eede, floor2: 0xc4ead5, wall: 0x6eaa89, accent: 0x5ac48a },
  qa: { floor1: 0xf0cbcb, floor2: 0xedc0c0, wall: 0xae7979, accent: 0xd46a6a },
  devsecops: { floor1: 0xf0d5c5, floor2: 0xedcdba, wall: 0xae8871, accent: 0xd4885a },
};
const DEPT_THEME_DARK: Record<string, RoomTheme> = {
  dev: { floor1: 0x0c1620, floor2: 0x0a121c, wall: 0x1e3050, accent: 0x285890 },
  design: { floor1: 0x120c20, floor2: 0x100a1e, wall: 0x2c1c50, accent: 0x482888 },
  planning: { floor1: 0x18140c, floor2: 0x16120a, wall: 0x3a2c1c, accent: 0x785828 },
  operations: { floor1: 0x0c1a18, floor2: 0x0a1614, wall: 0x1c4030, accent: 0x287848 },
  qa: { floor1: 0x1a0c10, floor2: 0x180a0e, wall: 0x401c1c, accent: 0x782828 },
  devsecops: { floor1: 0x18100c, floor2: 0x160e0a, wall: 0x3a241c, accent: 0x783828 },
};
let DEPT_THEME = DEPT_THEME_LIGHT;

function applyOfficeThemeMode(isDark: boolean): void {
  OFFICE_PASTEL = isDark ? OFFICE_PASTEL_DARK : OFFICE_PASTEL_LIGHT;
  DEFAULT_CEO_THEME = isDark ? DEFAULT_CEO_THEME_DARK : DEFAULT_CEO_THEME_LIGHT;
  DEFAULT_BREAK_THEME = isDark ? DEFAULT_BREAK_THEME_DARK : DEFAULT_BREAK_THEME_LIGHT;
  DEPT_THEME = isDark ? DEPT_THEME_DARK : DEPT_THEME_LIGHT;
}

export {
  OFFICE_PASTEL_LIGHT,
  OFFICE_PASTEL_DARK,
  OFFICE_PASTEL,
  DEFAULT_CEO_THEME_LIGHT,
  DEFAULT_CEO_THEME_DARK,
  DEFAULT_BREAK_THEME_LIGHT,
  DEFAULT_BREAK_THEME_DARK,
  DEFAULT_CEO_THEME,
  DEFAULT_BREAK_THEME,
  type SupportedLocale,
  LOCALE_TEXT,
  BREAK_CHAT_MESSAGES,
  pickLocale,
  inferReviewDecision,
  resolveMeetingDecision,
  getMeetingBadgeStyle,
  paintMeetingBadge,
  BREAK_SPOTS,
  DEPT_THEME_LIGHT,
  DEPT_THEME_DARK,
  DEPT_THEME,
  applyOfficeThemeMode,
};
