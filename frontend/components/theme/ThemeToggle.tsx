"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

/**
 * Bascule de thème. Icône unique qui pivote — pas un switch à deux états
 * (moins de bruit visuel dans une barre déjà chargée).
 */
export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Passer en clair" : "Passer en sombre"}
      title={dark ? "Passer en clair" : "Passer en sombre"}
      className={cn(
        "relative flex h-7 w-7 items-center justify-center rounded-lg",
        "border border-line text-muted transition-colors",
        "hover:border-candle/50 hover:text-candle",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -70, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 70, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.18 }}
          className="absolute"
        >
          {dark ? <Moon size={14} /> : <Sun size={14} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
