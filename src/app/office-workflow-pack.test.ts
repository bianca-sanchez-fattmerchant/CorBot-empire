import { describe, expect, it } from "vitest";
import type { Department } from "../types";
import {
  buildOfficePackPresentation,
  buildOfficePackStarterAgents,
  getOfficePackMeta,
  getOfficePackSeedTargetCount,
  listOfficePackOptions,
  resolveOfficePackSeedProvider,
} from "./office-workflow-pack";

function makeDepartment(id: string): Department {
  return {
    id,
    name: id.toUpperCase(),
    name_ko: `${id}-ko`,
    name_ja: `${id}-ja`,
    name_zh: `${id}-zh`,
    icon: "🏢",
    color: "#64748b",
    description: null,
    prompt: null,
    sort_order: 1,
    created_at: 1,
  };
}

describe("buildOfficePackStarterAgents", () => {
  it("development 팩에서는 기본 직원을 생성하지 않는다", () => {
    const starters = buildOfficePackStarterAgents({
      packKey: "development",
      departments: [makeDepartment("planning"), makeDepartment("dev")],
    });
    expect(starters).toHaveLength(0);
  });

  it("비개발 팩에서는 기본 직원(팀장 포함)을 생성한다", () => {
    const starters = buildOfficePackStarterAgents({
      packKey: "report",
      departments: [
        makeDepartment("planning"),
        makeDepartment("dev"),
        makeDepartment("design"),
        makeDepartment("qa"),
        makeDepartment("operations"),
      ],
      targetCount: 8,
    });

    expect(starters.length).toBeGreaterThanOrEqual(8);
    const leaderCount = starters.filter((agent) => agent.role === "team_leader").length;
    expect(leaderCount).toBeGreaterThanOrEqual(4);
    expect(starters.every((agent) => !!agent.department_id)).toBe(true);
  });

  it("비개발 팩 personality는 생성 시 locale 기준으로 작성된다", () => {
    const startersEn = buildOfficePackStarterAgents({
      packKey: "report",
      departments: [makeDepartment("planning"), makeDepartment("dev"), makeDepartment("design"), makeDepartment("qa")],
      targetCount: 4,
      locale: "en",
    });
    expect(startersEn.some((agent) => (agent.personality ?? "").includes("Prioritizes evidence quality"))).toBe(true);

    const startersJa = buildOfficePackStarterAgents({
      packKey: "report",
      departments: [makeDepartment("planning"), makeDepartment("dev"), makeDepartment("design"), makeDepartment("qa")],
      targetCount: 4,
      locale: "ja",
    });
    expect(startersJa.some((agent) => Boolean((agent.personality ?? "").trim()))).toBe(true);
  });

  it("starter 초안은 부서 내 순번(seed_order_in_department)을 기록한다", () => {
    const starters = buildOfficePackStarterAgents({
      packKey: "report",
      departments: [makeDepartment("planning"), makeDepartment("dev"), makeDepartment("design"), makeDepartment("qa")],
      targetCount: 8,
    });
    const planningOrders = starters
      .filter((agent) => agent.department_id === "planning")
      .map((agent) => agent.seed_order_in_department);
    expect(planningOrders.length).toBeGreaterThan(1);
    expect(planningOrders[0]).toBe(1);
    expect(planningOrders[1]).toBe(2);
  });

  it("오피스팩 seed 직원은 가능한 범위에서 sprite_number를 중복 없이 배정한다", () => {
    const starters = buildOfficePackStarterAgents({
      packKey: "video_preprod",
      departments: [
        makeDepartment("planning"),
        makeDepartment("dev"),
        makeDepartment("design"),
        makeDepartment("qa"),
        makeDepartment("operations"),
        makeDepartment("devsecops"),
      ],
      targetCount: 10,
    });
    const spriteNumbers = starters.map((agent) => agent.sprite_number);
    const unique = new Set(spriteNumbers);
    expect(unique.size).toBe(spriteNumbers.length);
  });
});

describe("resolveOfficePackSeedProvider", () => {
  it("기획팀은 claude/codex를 번갈아 배치한다", () => {
    expect(
      resolveOfficePackSeedProvider({
        packKey: "report",
        departmentId: "planning",
        role: "team_leader",
        seedIndex: 1,
        seedOrderInDepartment: 1,
      }),
    ).toBe("claude");
    expect(
      resolveOfficePackSeedProvider({
        packKey: "report",
        departmentId: "planning",
        role: "senior",
        seedIndex: 5,
        seedOrderInDepartment: 2,
      }),
    ).toBe("codex");
  });

  it("개발/디자인은 claude, 인프라보안/운영/QA는 codex를 사용한다", () => {
    expect(
      resolveOfficePackSeedProvider({ packKey: "report", departmentId: "dev", role: "senior", seedIndex: 2 }),
    ).toBe("claude");
    expect(
      resolveOfficePackSeedProvider({ packKey: "report", departmentId: "design", role: "senior", seedIndex: 3 }),
    ).toBe("claude");
    expect(
      resolveOfficePackSeedProvider({ packKey: "report", departmentId: "devsecops", role: "senior", seedIndex: 4 }),
    ).toBe("codex");
    expect(
      resolveOfficePackSeedProvider({ packKey: "report", departmentId: "operations", role: "senior", seedIndex: 5 }),
    ).toBe("codex");
    expect(resolveOfficePackSeedProvider({ packKey: "report", departmentId: "qa", role: "senior", seedIndex: 6 })).toBe(
      "codex",
    );
  });
});

describe("buildOfficePackPresentation", () => {
  it("비개발 팩 부서 설명/프롬프트를 locale 기준으로 생성한다", () => {
    const presentationEn = buildOfficePackPresentation({
      packKey: "report",
      locale: "en",
      departments: [makeDepartment("planning")],
      agents: [],
      customRoomThemes: {},
    });
    expect(presentationEn.departments[0]?.description).toContain("team");
    expect(presentationEn.departments[0]?.prompt).toContain("[Department Role]");

    const presentationKo = buildOfficePackPresentation({
      packKey: "report",
      locale: "ko",
      departments: [makeDepartment("planning")],
      agents: [],
      customRoomThemes: {},
    });
    expect(presentationKo.departments[0]?.description).toContain("협업");
    expect(presentationKo.departments[0]?.prompt).toContain("[부서 역할]");
  });
});

describe("office pack options", () => {
  it("사이드바에 다중 오피스 팩 옵션을 노출한다", () => {
    const options = listOfficePackOptions("en");
    const keys = options.map((option) => option.key);
    expect(keys).toEqual(expect.arrayContaining(["development", "report", "web_research_report", "video_preprod"]));
  });

  it("커스텀 이름이 있으면 옵션 라벨에 우선 적용한다", () => {
    const options = listOfficePackOptions("en", {
      report: "Documentation Ops",
    });
    const reportOption = options.find((option) => option.key === "report");
    expect(reportOption?.label).toBe("Documentation Ops");
  });

  it("커스텀 이름이 없으면 기본 메타 라벨을 유지한다", () => {
    const meta = getOfficePackMeta("report");
    expect(meta.label.en.length).toBeGreaterThan(0);
  });
});

describe("getOfficePackSeedTargetCount", () => {
  it("문서 중심 팩에 더 큰 시드 인원 목표를 반환한다", () => {
    expect(getOfficePackSeedTargetCount("report")).toBeGreaterThan(8);
    expect(getOfficePackSeedTargetCount("web_research_report")).toBeGreaterThan(8);
    expect(getOfficePackSeedTargetCount("development")).toBe(8);
  });
});
