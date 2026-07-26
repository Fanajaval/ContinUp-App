"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Hammer, PartyPopper, Sparkles, X } from "lucide-react";
import type { Declencheur, StyleSignal } from "@/lib/contracts";
import { cn } from "@/lib/utils";

/**
 * M4.5 — surface in-app du Signal : les toasts stylés par ton.
 * Intouchable selon la fiche B.
 *
 * Chaque toast respecte la règle d'or M4.3 : preuve de progrès + micro-action.
 * Le type l'impose — impossible d'émettre un toast culpabilisant.
 */

export type ToastPayload = {
  declencheur: Declencheur;
  style: StyleSignal;
  titre: string;
  /** Règle d'or : obligatoire. */
  preuve: string;
  /** Règle d'or : obligatoire. */
  microAction: string;
  lien?: string;
  xp?: number;
};

type ToastItem = ToastPayload & { id: number };

const Ctx = createContext<{ push: (t: ToastPayload) => void }>({
  push: () => {},
});

export const useToast = () => useContext(Ctx);

const DECL_META: Record<
  Declencheur,
  { icon: typeof Bell; accent: string; ring: string; tag: string }
> = {
  S1: { icon: Hammer, accent: "text-grow", ring: "ring-grow/40", tag: "Brique posée" },
  S3: { icon: Bell, accent: "text-candle", ring: "ring-candle/45", tag: "Signal du 4ᵉ jour" },
  S5: { icon: PartyPopper, accent: "text-gold", ring: "ring-gold/45", tag: "Te revoilà" },
  S6: { icon: Sparkles, accent: "text-candle-soft", ring: "ring-candle/35", tag: "Déblocage proche" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((t: ToastPayload) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setItems((p) => p.filter((i) => i.id !== id)), 9000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(94vw,26rem)] flex-col gap-3">
        <AnimatePresence>
          {items.map((t) => {
            const m = DECL_META[t.declencheur];
            const Icon = m.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 60, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.94 }}
                transition={{ type: "spring", stiffness: 240, damping: 24 }}
                className={cn(
                  "pointer-events-auto panel p-4 shadow-lift ring-1",
                  m.ring
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 shrink-0", m.accent)}>
                    <Icon size={19} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("label-xs", m.accent)}>{m.tag}</span>
                      {t.xp ? (
                        <span className="rounded-full bg-grow/15 px-2 py-0.5 text-[10px] font-semibold text-grow">
                          +{t.xp} XP
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-display text-[15px] font-semibold leading-snug text-ink">
                      {t.titre}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                      {t.preuve}
                    </p>
                    {/* La micro-action, toujours détachée et actionnable */}
                    <div className="mt-2.5 rounded-lg border border-line bg-surface/70 px-3 py-2">
                      <p className="label-xs mb-0.5">Prochaine action</p>
                      <p className="text-[13px] leading-snug text-ink">
                        {t.microAction}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setItems((p) => p.filter((i) => i.id !== t.id))}
                    className="shrink-0 rounded-md p-1 text-faint transition hover:bg-surface hover:text-muted"
                    aria-label="Fermer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
