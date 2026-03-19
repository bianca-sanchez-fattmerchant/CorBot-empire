import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import AppHeaderBar from "./AppHeaderBar";

function createBaseProps(): ComponentProps<typeof AppHeaderBar> {
  return {
    currentView: "office" as const,
    connected: true,
    viewTitle: "Office",
    tasksPrimaryLabel: "Tasks",
    decisionLabel: "Decisions",
    decisionInboxLoading: false,
    decisionInboxCount: 0,
    agentStatusLabel: "Agent Status",
    reportLabel: "Reports",
    announcementLabel: "Announcement",
    roomManagerLabel: "Room Manager",
    theme: "dark" as const,
    mobileHeaderMenuOpen: true,
    onOpenMobileNav: vi.fn(),
    onOpenTasks: vi.fn(),
    onOpenDecisionInbox: vi.fn(),
    onOpenAgentStatus: vi.fn(),
    onOpenReportHistory: vi.fn(),
    onOpenAnnouncement: vi.fn(),
    onOpenRoomManager: vi.fn(),
    onToggleTheme: vi.fn(),
    onToggleMobileHeaderMenu: vi.fn(),
    onCloseMobileHeaderMenu: vi.fn(),
  };
}

describe("AppHeaderBar mobile office pack selector", () => {
  it("오피스팩 컨트롤이 없으면 모바일 메뉴에 셀렉터를 표시하지 않는다", () => {
    const props = createBaseProps();
    render(<AppHeaderBar {...props} />);

    expect(screen.queryByLabelText("Office Pack")).not.toBeInTheDocument();
    expect(document.getElementById("mobile-office-pack-selector")).toBeNull();
  });
});
