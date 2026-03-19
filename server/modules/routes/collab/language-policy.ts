import { isLang, type Lang } from "../../../types/lang.ts";

export type L10n = Record<Lang, string[]>;

export type DirectivePolicy = {
  skipDelegation: boolean;
  skipDelegationReason: "no_task" | "lightweight" | null;
  skipPlannedMeeting: boolean;
  skipPlanSubtasks: boolean;
};

interface LanguagePolicyDeps {
  db: any;
}

const ROLE_LABEL: Record<string, string> = {
  team_leader: "Team Lead",
  senior: "Senior",
  junior: "Junior",
  intern: "Intern",
};

const ROLE_LABEL_L10N: Record<string, Record<Lang, string>> = {
  team_leader: { ko: "Team Lead", en: "Team Lead", ja: "Team Lead", zh: "Team Lead" },
  senior: { ko: "Senior", en: "Senior", ja: "Senior", zh: "Senior" },
  junior: { ko: "Junior", en: "Junior", ja: "Junior", zh: "Junior" },
  intern: { ko: "Intern", en: "Intern", ja: "Intern", zh: "Intern" },
};

const DEPT_KEYWORDS: Record<string, string[]> = {
  dev: ["development", "coding", "frontend", "backend", "api", "server", "code", "bug", "app", "web"],
  design: ["design", "ui", "ux", "mockup", "figma", "icon", "logo", "banner", "layout"],
  planning: ["planning", "strategy", "analysis", "research", "report", "presentation", "market", "proposal"],
  operations: ["operations", "deploy", "infrastructure", "monitoring", "server management", "ci", "cd", "devops"],
  qa: ["qa", "qc", "quality", "test", "verification", "bug report", "regression", "automation test", "performance test", "review"],
  devsecops: ["security", "vulnerability", "auth", "ssl", "firewall", "penetration", "pipeline", "container", "docker", "kubernetes", "encryption"],
};

function includesAnyTerm(content: string, terms: string[]): boolean {
  const normalized = content.toLowerCase().replace(/\s+/g, " ").trim();
  const compact = normalized.replace(/\s+/g, "");
  const includesTerm = (term: string): boolean => {
    const termNorm = term.toLowerCase();
    return normalized.includes(termNorm) || compact.includes(termNorm.replace(/\s+/g, ""));
  };
  return terms.some(includesTerm);
}

function normalizeForSearch(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function compactForSearch(value: unknown): string {
  return normalizeForSearch(value).replace(/\s+/g, "");
}

function collectDepartmentAliases(input: unknown): string[] {
  const base = String(input ?? "").trim();
  if (!base) return [];
  const out = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeForSearch(value);
    if (normalized.length < 2) return;
    out.add(normalized);
  };

  add(base);
  add(base.replace(/[\s_-]+/g, ""));
  add(base.replace(/\s*(team lead|team|department|dept)\s*$/i, ""));
  add(base.replace(/[(){}\[\]<>]/g, " "));

  return [...out];
}

export function initializeCollabLanguagePolicy(deps: LanguagePolicyDeps) {
  const { db } = deps;

  function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function readSettingString(key: string): string | undefined {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
    if (!row) return undefined;
    try {
      const parsed = JSON.parse(row.value);
      return typeof parsed === "string" ? parsed : row.value;
    } catch {
      return row.value;
    }
  }

  function getPreferredLanguage(): Lang {
    return "en";
  }

  function detectLang(_text: string): Lang {
    return "en";
  }

  function resolveLang(_text?: string, _fallback?: Lang): Lang {
    return "en";
  }

  function l(ko: string[], en: string[], ja?: string[], zh?: string[]): L10n {
    return {
      ko,
      en,
      ja: ja ?? en.map((s) => s),
      zh: zh ?? en.map((s) => s),
    };
  }

  function pickL(pool: L10n, lang: Lang): string {
    const arr = pool.en;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getFlairs(agentName: string, _lang: Lang): string[] {
    const flairs: Record<string, string[]> = {
      Aria: ["reviewing code", "planning a refactor", "checking PRs"],
      Bolt: ["coding fast", "designing APIs", "tuning performance"],
      Nova: ["studying new tech", "building a prototype", "writing experimental code"],
      Pixel: ["working on mockups", "organizing components", "updating the UI guide"],
      Luna: ["working on animations", "refining the color palette", "analyzing UX"],
      Sage: ["reviewing market analysis", "organizing strategy docs", "researching competitors"],
      Clio: ["analyzing data", "drafting a proposal", "organizing user interviews"],
      Atlas: ["monitoring servers", "checking deploy pipelines", "reviewing ops metrics"],
      Turbo: ["running automation scripts", "optimizing CI/CD", "cleaning up infra"],
      Hawk: ["reviewing test cases", "analyzing bug reports", "checking quality metrics"],
      Lint: ["writing automated tests", "inspecting code", "running regression tests"],
      Vault: ["running a security audit", "reviewing vuln scan results", "checking auth logic"],
      Pipe: ["building pipelines", "configuring containers", "automating deployments"],
    };
    return flairs[agentName] ?? ["working on tasks", "making progress", "getting things done"];
  }

  function getRoleLabel(role: string, lang: Lang): string {
    return ROLE_LABEL_L10N[role]?.[lang] ?? ROLE_LABEL[role] ?? role;
  }

  function classifyIntent(msg: string, lang: Lang) {
    void lang;
    const checks: Record<string, RegExp[]> = {
      greeting: [/hello|hi\b|hey|good\s*(morning|afternoon|evening)|howdy|what'?s\s*up/i],
      presence: [/are you (there|here|around|available|at your desk)|you there|anybody|present/i],
      whatDoing: [/what are you (doing|up to|working on)|busy|free|what'?s going on|occupied/i],
      report: [/report|status|progress|update|how('?s| is) (it|the|your)|results/i],
      praise: [/good (job|work)|well done|thank|great|awesome|amazing|excellent|nice|kudos|bravo/i],
      encourage: [/keep (it )?up|go for it|you (got|can do) (this|it)|cheer|hang in there/i],
      joke: [/lol|lmao|haha|joke|funny|bored|play/i],
      complaint: [/slow|frustrat|why (is|so)|when (will|is)|hurry|delay|late|taking (too )?long/i],
      opinion: [/what do you think|opinion|idea|suggest|how about|thoughts|recommend/i],
      canDo: [/can you|could you|possible|able to|handle|take care|would you|please/i],
      question: [/\?|what|where|when|why|how|which|who/i],
    };

    const result: Record<string, boolean> = {};
    for (const [key, patterns] of Object.entries(checks)) {
      result[key] = patterns.some((p) => p.test(msg));
    }
    return result;
  }

  function analyzeDirectivePolicy(content: string): DirectivePolicy {
    const text = content.trim();

    // Meeting skip is now controlled exclusively via API parameter (skipPlannedMeeting: true).
    // Text-based keyword matching for "회의 없이" etc. has been removed for safety.
    const isNoMeeting = false;

    const isNoTask = includesAnyTerm(text, [
      "without creating tasks",
      "no task creation",
      "without delegation",
      "no task",
      "no delegation",
      "without delegation",
      "do not delegate",
      "don't delegate",
    ]);

    const hasLightweightSignal = includesAnyTerm(text, [
      "ping",
      "response test",
      "test only",
      "health check",
      "health check",
      "status check",
      "status only",
      "check only",
      "ack test",
      "smoke test",
    ]);

    const hasWorkSignal = includesAnyTerm(text, [
      "실행",
      "진행",
      "execute",
      "proceed",
      "start",
      "task",
      "work",
      "delegate",
      "assign",
      "implement",
      "deploy",
      "fix",
      "review",
      "plan",
      "subtask",
      "task",
      "handoff",
    ]);

    const isLightweight = hasLightweightSignal && !hasWorkSignal;
    const skipDelegation = isNoTask || isLightweight;
    const skipDelegationReason: DirectivePolicy["skipDelegationReason"] = isNoTask
      ? "no_task"
      : isLightweight
        ? "lightweight"
        : null;
    const skipPlannedMeeting = !skipDelegation && isNoMeeting;
    const skipPlanSubtasks = skipPlannedMeeting;

    return {
      skipDelegation,
      skipDelegationReason,
      skipPlannedMeeting,
      skipPlanSubtasks,
    };
  }

  function shouldExecuteDirectiveDelegation(policy: DirectivePolicy, explicitSkipPlannedMeeting: boolean): boolean {
    if (!policy.skipDelegation) return true;
    if (explicitSkipPlannedMeeting && policy.skipDelegationReason === "lightweight") return true;
    return false;
  }

  function detectTargetDepartments(message: string): string[] {
    const found = new Set<string>();
    for (const [deptId, keywords] of Object.entries(DEPT_KEYWORDS)) {
      for (const kw of keywords) {
        if (message.includes(kw)) {
          found.add(deptId);
          break;
        }
      }
    }

    // Dynamic department aliases: supports office-pack specific localized names.
    const messageNormalized = normalizeForSearch(message);
    const messageCompact = compactForSearch(message);
    const departments = db.prepare("SELECT id, name, name_ko, name_ja, name_zh FROM departments").all() as Array<{
      id: string;
      name: string;
      name_ko?: string | null;
      name_ja?: string | null;
      name_zh?: string | null;
    }>;
    for (const dept of departments) {
      const aliases = [
        ...collectDepartmentAliases(dept.id),
        ...collectDepartmentAliases(dept.name),
        ...collectDepartmentAliases(dept.name_ko),
        ...collectDepartmentAliases(dept.name_ja),
        ...collectDepartmentAliases(dept.name_zh),
      ];
      for (const alias of aliases) {
        const aliasCompact = alias.replace(/\s+/g, "");
        if (messageNormalized.includes(alias) || (aliasCompact && messageCompact.includes(aliasCompact))) {
          found.add(dept.id);
          break;
        }
      }
    }

    return [...found];
  }

  return {
    DEPT_KEYWORDS,
    pickRandom,
    getPreferredLanguage,
    resolveLang,
    detectLang,
    l,
    pickL,
    getFlairs,
    getRoleLabel,
    classifyIntent,
    analyzeDirectivePolicy,
    shouldExecuteDirectiveDelegation,
    detectTargetDepartments,
  };
}
