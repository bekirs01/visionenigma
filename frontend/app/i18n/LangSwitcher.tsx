"use client";

import { useI18n } from "./I18nProvider";

export function LangSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        type="button"
        onClick={() => setLang("ru")}
        className={`px-2 py-1 rounded ${lang === "ru" ? "bg-indigo-100 text-indigo-800 font-medium" : "text-slate-600 hover:bg-slate-100"}`}
      >
        RU
      </button>
      <span className="text-slate-300">|</span>
      <button
        type="button"
        onClick={() => setLang("tr")}
        className={`px-2 py-1 rounded ${lang === "tr" ? "bg-indigo-100 text-indigo-800 font-medium" : "text-slate-600 hover:bg-slate-100"}`}
      >
        TR
      </button>
    </div>
  );
}
