"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import ru from "@/app/locales/ru.json";
import tr from "@/app/locales/tr.json";

const LANG_KEY = "support_lang";
type Lang = "ru" | "tr";
const dicts: Record<Lang, Record<string, string>> = { ru, tr };

type ContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<ContextValue | null>(null);

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "ru";
  const s = localStorage.getItem(LANG_KEY);
  return s === "tr" ? "tr" : "ru";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLangState(getInitialLang());
    setMounted(true);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem(LANG_KEY, l);
  }, []);

  const t = useCallback(
    (key: string) => {
      const d = dicts[lang] ?? dicts.ru;
      return (d as Record<string, string>)[key] ?? key;
    },
    [lang]
  );

  const value = mounted ? { lang, setLang, t } : { lang: "ru" as Lang, setLang, t };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) return { lang: "ru" as Lang, setLang: () => {}, t: (k: string) => k };
  return ctx;
}
