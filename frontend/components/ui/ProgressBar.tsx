"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * NF4 CODÉE DANS LE COMPOSANT — le garde-fou du CDC §3 M5.1 / §7.
 *
 * `etape` est une prop OBLIGATOIRE (non optionnelle) : il est
 * techniquement impossible d'afficher un % nu dans cette app.
 * « un % nu et froid recrée le silence du if ». — CDC point 5.
 *
 * Aucun rouge, jamais, quel que soit le pourcentage.
 */

type Props = {
  value: number;
  /** ⚠️ Obligatoire par design. Ne pas rendre optionnel. */
  etape: string;
  tone?: "grow" | "candle" | "gold";
  size?: "sm" | "md";
  className?: string;
};

const TONES = {
  grow: { bar: "from-grow-deep via-grow to-grow-soft", txt: "text-grow", glow: "shadow-grow" },
  candle: { bar: "from-candle-deep via-candle to-candle-soft", txt: "text-candle", glow: "shadow-candle" },
  gold: { bar: "from-gold-deep via-gold to-cream", txt: "text-gold", glow: "shadow-gold" },
} as const;

export default function ProgressBar({
  value,
  etape,
  tone = "grow",
  size = "md",
  className,
}: Props) {
  const t = TONES[tone];
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        {/* L'étape sémantique passe AVANT le chiffre : le sens d'abord. */}
        <span className={cn("truncate font-medium", size === "sm" ? "text-xs" : "text-sm", t.txt)}>
          {etape}
        </span>
        <span
          className={cn(
            "shrink-0 tabular-nums text-muted",
            size === "sm" ? "text-[11px]" : "text-xs"
          )}
        >
          {pct}%
        </span>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-full bg-surface ring-1 ring-inset ring-line",
          size === "sm" ? "h-1.5" : "h-2"
        )}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${etape} — ${pct} %`}
      >
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", t.bar, t.glow)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 18, delay: 0.15 }}
        />
        {tone === "gold" && <div className="shine absolute inset-0 rounded-full" />}
      </div>
    </div>
  );
}
