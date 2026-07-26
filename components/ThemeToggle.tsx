import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

const THEMES = ["light", "dark", "system"] as const;

const ICONS = {
  light:  <Sun size={18} />,
  dark:   <Moon size={18} />,
  system: <Monitor size={18} />,
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  const current = (theme ?? "system") as keyof typeof ICONS;

  function cycle() {
    const idx = THEMES.indexOf(current as any);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  }

  return (
    <button
      onClick={cycle}
      title={`Theme: ${current}`}
      className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
    >
      {ICONS[current]}
    </button>
  );
}
