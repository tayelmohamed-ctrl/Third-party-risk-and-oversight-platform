import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type PlatformTheme = "light" | "dark";

const STORAGE_KEY = "mal-platform-theme";

type Ctx = {
  theme: PlatformTheme;
  setTheme: (t: PlatformTheme) => void;
  toggleTheme: () => void;
};

const PlatformThemeContext = createContext<Ctx | null>(null);

function readStoredTheme(): PlatformTheme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return "dark";
}

function applyThemeToDocument(theme: PlatformTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
}

export function PlatformThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<PlatformTheme>(() => {
    applyThemeToDocument(readStoredTheme());
    return readStoredTheme();
  });

  const setTheme = (t: PlatformTheme) => setThemeState(t);
  const toggleTheme = () => setThemeState((prev) => (prev === "dark" ? "light" : "dark"));

  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return (
    <PlatformThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </PlatformThemeContext.Provider>
  );
}

export function usePlatformTheme() {
  const ctx = useContext(PlatformThemeContext);
  if (!ctx) throw new Error("usePlatformTheme must be used within PlatformThemeProvider");
  return ctx;
}
