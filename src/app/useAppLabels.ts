import { useMemo } from "react";
import type * as api from "../api";
import type { CompanySettings, Department } from "../types";
import type { RuntimeOs, View } from "./types";

interface UseAppLabelsParams {
  view: View;
  settings: CompanySettings;
  departments: Department[];
  theme: "light" | "dark";
  runtimeOs: RuntimeOs;
  forceUpdateBanner: boolean;
  updateStatus: api.UpdateStatus | null;
  dismissedUpdateVersion: string;
}

export function useAppLabels({
  view,
  settings,
  departments,
  theme,
  runtimeOs,
  forceUpdateBanner,
  updateStatus,
  dismissedUpdateVersion,
}: UseAppLabelsParams) {
  void settings;
  const uiLanguage = "en" as const;
  const loadingTitle = "Loading CorBot-Empire...";
  const loadingSubtitle = "Preparing your AI agent empire";
  const viewTitle = (() => {
    switch (view) {
      case "office":
        return "🏢 Office";
      case "packs":
        return "🗂️ Office Packs";
      case "dashboard":
        return "📊 Dashboard";
      case "tasks":
        return "📋 Tasks";
      case "agents":
        return "Agents";
      case "skills":
        return "📚 Skills";
      case "settings":
        return "⚙️ Settings";
      default:
        return "";
    }
  })();
  const announcementLabel = "📢 Announcement";
  const roomManagerLabel = "🏢 Office Manager";
  const roomManagerDepartments = useMemo(
    () => [
      {
        id: "ceoOffice",
        name: "CEO Office",
      },
      ...departments,
      {
        id: "breakRoom",
        name: "Break Room",
      },
    ],
    [departments],
  );
  const reportLabel = "📋 Reports";
  const tasksPrimaryLabel = "Tasks";
  const agentStatusLabel = "Agents";
  const decisionLabel = "Decisions";
  const effectiveUpdateStatus = forceUpdateBanner
    ? {
        current_version: updateStatus?.current_version ?? "1.1.0",
        latest_version: updateStatus?.latest_version ?? "1.1.1-test",
        update_available: true,
        release_url: updateStatus?.release_url ?? "https://github.com/GreenSheep01201/claw-empire/releases/latest",
        checked_at: Date.now(),
        enabled: true,
        repo: updateStatus?.repo ?? "GreenSheep01201/claw-empire",
        error: null,
      }
    : updateStatus;
  const updateBannerVisible = Boolean(
    effectiveUpdateStatus?.enabled &&
    effectiveUpdateStatus.update_available &&
    effectiveUpdateStatus.latest_version &&
    (forceUpdateBanner || effectiveUpdateStatus.latest_version !== dismissedUpdateVersion),
  );
  const updateReleaseUrl =
    effectiveUpdateStatus?.release_url ??
    `https://github.com/${effectiveUpdateStatus?.repo ?? "GreenSheep01201/claw-empire"}/releases/latest`;
  const updateTitle = updateBannerVisible
    ? `New version v${effectiveUpdateStatus?.latest_version} is available (current v${effectiveUpdateStatus?.current_version}).`
    : "";
  const updateHint =
    runtimeOs === "windows"
      ? "In Windows PowerShell, run `git pull; pnpm install`, then restart the server."
      : "On macOS/Linux, run `git pull && pnpm install`, then restart the server.";
  const updateReleaseLabel = "Release Notes";
  const updateDismissLabel = "Dismiss";
  const autoUpdateNoticeVisible = Boolean(settings.autoUpdateNoticePending);
  const autoUpdateNoticeTitle = "Update notice: Auto Update toggle has been added.";
  const autoUpdateNoticeHint =
    "For existing installs (v1.1.3 and below), the default remains OFF. You can enable it in Settings > General when needed.";
  const autoUpdateNoticeActionLabel = "Got it";
  const autoUpdateNoticeContainerClass =
    theme === "light"
      ? "border-b border-sky-200 bg-sky-50 px-3 py-2.5 sm:px-4 lg:px-6"
      : "border-b border-sky-500/30 bg-sky-500/10 px-3 py-2.5 sm:px-4 lg:px-6";
  const autoUpdateNoticeTextClass = theme === "light" ? "min-w-0 text-xs text-sky-900" : "min-w-0 text-xs text-sky-100";
  const autoUpdateNoticeHintClass =
    theme === "light" ? "mt-0.5 text-[11px] text-sky-800" : "mt-0.5 text-[11px] text-sky-200/90";
  const autoUpdateNoticeButtonClass =
    theme === "light"
      ? "rounded-md border border-sky-300 bg-white px-2.5 py-1 text-[11px] text-sky-900 transition hover:bg-sky-100"
      : "rounded-md border border-sky-300/40 bg-sky-200/10 px-2.5 py-1 text-[11px] text-sky-100 transition hover:bg-sky-200/20";
  const updateTestModeHint = forceUpdateBanner
    ? "Test display mode is on. Remove `?force_update_banner=1` to return to normal behavior."
    : "";

  return {
    uiLanguage,
    loadingTitle,
    loadingSubtitle,
    viewTitle,
    announcementLabel,
    roomManagerLabel,
    roomManagerDepartments,
    reportLabel,
    tasksPrimaryLabel,
    agentStatusLabel,
    decisionLabel,
    effectiveUpdateStatus,
    updateBannerVisible,
    updateReleaseUrl,
    updateTitle,
    updateHint,
    updateReleaseLabel,
    updateDismissLabel,
    autoUpdateNoticeVisible,
    autoUpdateNoticeTitle,
    autoUpdateNoticeHint,
    autoUpdateNoticeActionLabel,
    autoUpdateNoticeContainerClass,
    autoUpdateNoticeTextClass,
    autoUpdateNoticeHintClass,
    autoUpdateNoticeButtonClass,
    updateTestModeHint,
  };
}
