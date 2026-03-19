import type { CliProvider } from "../../types";
import type { LocalSettings, SetLocalSettings, TFunction } from "./types";

interface GeneralSettingsTabProps {
  t: TFunction;
  form: LocalSettings;
  setForm: SetLocalSettings;
  saved: boolean;
  onSave: () => void;
}

interface ToggleSettingCardProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
  title?: string;
}

function ToggleSettingCard({ label, checked, onToggle, title }: ToggleSettingCardProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 sm:px-4"
      style={{ borderColor: "var(--th-card-border)", background: "var(--th-input-bg)" }}
    >
      <label className="text-sm" style={{ color: "var(--th-text-secondary)" }}>
        {label}
      </label>
      <button
        type="button"
        aria-pressed={checked}
        aria-label={label}
        onClick={onToggle}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-blue-500" : "bg-slate-600"}`}
        title={title}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function GeneralSettingsTab({ t, form, setForm, saved, onSave }: GeneralSettingsTabProps) {
  return (
    <>
      <section
        className="rounded-xl p-5 sm:p-6 space-y-5"
        style={{ background: "var(--th-card-bg)", border: "1px solid var(--th-card-border)" }}
      >
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--th-text-primary)" }}>
          {t({ ko: "Company", en: "Company", ja: "Company", zh: "公司信息" })}
        </h3>

        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--th-text-secondary)" }}>
            {t({ ko: "Company Name", en: "Company Name", ja: "Company Name", zh: "公司名称" })}
          </label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            style={{
              background: "var(--th-input-bg)",
              borderColor: "var(--th-input-border)",
              color: "var(--th-text-primary)",
            }}
          />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--th-text-secondary)" }}>
            {t({ ko: "CEO Name", en: "CEO Name", ja: "CEO Name", zh: "CEO 名称" })}
          </label>
          <input
            type="text"
            value={form.ceoName}
            onChange={(e) => setForm({ ...form, ceoName: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            style={{
              background: "var(--th-input-bg)",
              borderColor: "var(--th-input-border)",
              color: "var(--th-text-primary)",
            }}
          />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--th-text-secondary)" }}>
            {t({
              ko: "Default Project Folder", en: "Default Project Folder", ja: "Default Project Folder",
              zh: "默认项目文件夹",
            })}
          </label>
          <input
            type="text"
            value={form.defaultProjectPath ?? ""}
            onChange={(e) => setForm({ ...form, defaultProjectPath: e.target.value })}
            placeholder={t({
              ko: "e.g. /Users/yourname/Projects", en: "e.g. /Users/yourname/Projects", ja: "e.g. /Users/yourname/Projects",
              zh: "例如: /Users/yourname/Projects",
            })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            style={{
              background: "var(--th-input-bg)",
              borderColor: "var(--th-input-border)",
              color: "var(--th-text-primary)",
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ToggleSettingCard
            label={t({ ko: "Auto Assign", en: "Auto Assign", ja: "Auto Assign", zh: "自动分配" })}
            checked={form.autoAssign}
            onToggle={() => setForm({ ...form, autoAssign: !form.autoAssign })}
          />

          <ToggleSettingCard
            label={t({ ko: "YOLO Mode", en: "YOLO Mode", ja: "YOLO Mode", zh: "YOLO 模式" })}
            checked={form.yoloMode === true}
            onToggle={() => setForm({ ...form, yoloMode: !(form.yoloMode === true) })}
            title={t({
              ko: "When enabled, the planning lead auto-analyzes decision steps and proceeds automatically.", en: "When enabled, the planning lead auto-analyzes decision steps and proceeds automatically.", ja: "When enabled, the planning lead auto-analyzes decision steps and proceeds automatically.",
              zh: "启用后，规划负责人会自动分析决策步骤并推进到下一阶段。",
            })}
          />

          <ToggleSettingCard
            label={t({
              ko: "Auto Update (Global)", en: "Auto Update (Global)", ja: "Auto Update (Global)",
              zh: "自动更新（全局）",
            })}
            checked={form.autoUpdateEnabled}
            onToggle={() => setForm({ ...form, autoUpdateEnabled: !form.autoUpdateEnabled })}
            title={t({
              ko: "Enable or disable auto-update loop for the whole server.", en: "Enable or disable auto-update loop for the whole server.", ja: "Enable or disable auto-update loop for the whole server.",
              zh: "启用或禁用整个服务器的自动更新循环。",
            })}
          />

          <ToggleSettingCard
            label={t({ ko: "OAuth Auto Swap", en: "OAuth Auto Swap", ja: "OAuth Auto Swap", zh: "OAuth 自动切换" })}
            checked={form.oauthAutoSwap !== false}
            onToggle={() => setForm({ ...form, oauthAutoSwap: !(form.oauthAutoSwap !== false) })}
            title={t({
              ko: "Auto-switch to next OAuth account on failures/limits", en: "Auto-switch to next OAuth account on failures/limits", ja: "Auto-switch to next OAuth account on failures/limits",
              zh: "失败/额度限制时自动切换到下一个 OAuth 账号",
            })}
          />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--th-text-secondary)" }}>
            {t({
              ko: "Default CLI Provider", en: "Default CLI Provider", ja: "Default CLI Provider",
              zh: "默认 CLI 提供方",
            })}
          </label>
          <select
            value={form.defaultProvider}
            onChange={(e) => setForm({ ...form, defaultProvider: e.target.value as CliProvider })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            style={{
              background: "var(--th-input-bg)",
              borderColor: "var(--th-input-border)",
              color: "var(--th-text-primary)",
            }}
          >
            <option value="claude">Claude Code</option>
            <option value="codex">Codex CLI</option>
            <option value="gemini">Gemini CLI</option>
            <option value="opencode">OpenCode</option>
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--th-text-secondary)" }}>
            Language
          </label>
          <select
            value="en"
            onChange={() => setForm({ ...form, language: "en" as LocalSettings["language"] })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            style={{
              background: "var(--th-input-bg)",
              borderColor: "var(--th-input-border)",
              color: "var(--th-text-primary)",
            }}
          >
            <option value="en">English</option>
          </select>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        {saved && (
          <span className="text-green-400 text-sm self-center">
            ✅ {t({ ko: "Saved", en: "Saved", ja: "Saved", zh: "已保存" })}
          </span>
        )}
        <button
          onClick={onSave}
          className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30"
        >
          {t({ ko: "Save", en: "Save", ja: "Save", zh: "保存" })}
        </button>
      </div>
    </>
  );
}
