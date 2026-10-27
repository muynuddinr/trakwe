"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
      <span>{theme === "light" ? "Dark" : "Light"}</span>
    </button>
  );
}
