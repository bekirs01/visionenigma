"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import ru from "@/app/locales/ru.json";
import tr from "@/app/locales/tr.json";

const LANG_KEY = "support_lang";
type Lang = "ru" | "tr";
const dicts: Record<Lang, Record<string, string>> = { ru, tr };

const noopT = (key: string) => key;

type ContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<ContextValue>({
  lang: "ru",
  setLang: () => {},
  t: noopT,
});

function getInitialLang(): Lang {
  return "ru";
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

  const value = useMemo(
    () => ({ lang: mounted ? lang : ("ru" as Lang), setLang, t: typeof t === "function" ? t : noopT }),
    [lang, mounted, setLang, t]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): ContextValue {
  const ctx = useContext(I18nContext);
  return {
    lang: ctx?.lang ?? "ru",
    setLang: typeof ctx?.setLang === "function" ? ctx.setLang : () => {},
    t: typeof ctx?.t === "function" ? ctx.t : noopT,
  };
}
