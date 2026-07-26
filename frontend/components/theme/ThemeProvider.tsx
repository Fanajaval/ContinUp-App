"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * THÈME CLAIR / SOMBRE.
 *
 * - Persiste dans localStorage sous `qj-theme`.
 * - Suit le système tant que l'utilisateur n'a pas choisi explicitement.
 * - Le script anti-flash (voir THEME_SCRIPT) applique la classe AVANT
 *   le premier rendu : jamais de flash blanc à l'ouverture.
 */

export type Theme = "dark" | "light";

const KEY = "qj-theme";

const Ctx = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}>({ theme: "dark", setTheme: () => {}, toggle: () => {} });

export const useTheme = () => useContext(Ctx);

/** Injecté en <head> : s'exécute avant la peinture, tue le flash. */
export const THEME_SCRIPT = `(function(){try{
var t=localStorage.getItem('${KEY}');
if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}
if(t==='light'){document.documentElement.classList.add('light');}
}catch(e){}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  // Lit l'état réel posé par le script anti-flash
  useEffect(() => {
    setThemeState(
      document.documentElement.classList.contains("light") ? "light" : "dark"
    );
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.classList.toggle("light", t === "light");
    try {
      localStorage.setItem(KEY, t);
    } catch {}
  }, []);

  const toggle = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme]
  );

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
