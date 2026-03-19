import { createElement } from "react";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  I18nProvider,
  detectBrowserLanguage,
  type I18nContextValue,
  localeFromLanguage,
  localeName,
  normalizeLanguage,
  pickLang,
  useI18n,
  type LangText,
} from "./i18n";

const ORIGINAL_LANGUAGE = window.navigator.language;
const ORIGINAL_LANGUAGES = window.navigator.languages;

describe("i18n helpers", () => {
  afterEach(() => {
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: ORIGINAL_LANGUAGE,
    });
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ORIGINAL_LANGUAGES,
    });
  });

  it("normalizeLanguage always resolves to English", () => {
    expect(normalizeLanguage("ko-KR")).toBe("en");
    expect(normalizeLanguage("en_US")).toBe("en");
    expect(normalizeLanguage("ja-JP")).toBe("en");
    expect(normalizeLanguage("zh-CN")).toBe("en");
    expect(normalizeLanguage("fr-FR")).toBe("en");
    expect(normalizeLanguage(undefined)).toBe("en");
  });

  it("detectBrowserLanguage returns English", () => {
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ["ja-JP", "en-US"],
    });
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: "ko-KR",
    });
    expect(detectBrowserLanguage()).toBe("en");
  });

  it("localeName/pickLang/localeFromLanguage use English-only output", () => {
    const text: LangText = {
      en: "hello",
    };
    expect(pickLang("en", text)).toBe("hello");
    expect(pickLang("ja", text)).toBe("hello");
    expect(pickLang("zh", text)).toBe("hello");

    expect(
      localeName("ko", {
        name: "Planning",
        name_ko: "기획",
      }),
    ).toBe("Planning");
    expect(
      localeName("ja", {
        name: "Planning",
        name_ja: "",
      }),
    ).toBe("Planning");

    expect(localeFromLanguage("ko")).toBe("en-US");
    expect(localeFromLanguage("en")).toBe("en-US");
    expect(localeFromLanguage("ja")).toBe("en-US");
    expect(localeFromLanguage("zh")).toBe("en-US");
  });

  it("useI18n resolves to English even with non-English overrides", () => {
    let result: I18nContextValue = {
      language: "en",
      locale: "en-US",
      t: (text) => (typeof text === "string" ? text : text.en),
    };
    const Probe = ({ override }: { override?: string }) => {
      result = useI18n(override);
      return null;
    };

    const { rerender } = render(
      createElement(I18nProvider, {
        language: "ko",
        children: createElement(Probe, { override: "ja-JP" }),
      }),
    );

    expect(result.language).toBe("en");
    expect(result.locale).toBe("en-US");
    expect(
      result.t({
        ko: "안녕하세요",
        en: "hello",
        ja: "こんにちは",
        zh: "你好",
      }),
    ).toBe("hello");

    rerender(
      createElement(I18nProvider, {
        language: "ko",
        children: createElement(Probe, { override: undefined }),
      }),
    );

    expect(result.language).toBe("en");
    expect(result.locale).toBe("en-US");
    expect(
      result.t({
        ko: "안녕하세요",
        en: "hello",
        ja: "こんにちは",
        zh: "你好",
      }),
    ).toBe("hello");
  });
});
