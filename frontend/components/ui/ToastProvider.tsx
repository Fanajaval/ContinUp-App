"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TOASTS SYSTÈME — retours d'interface courants.
 *
 * ⚠️ À ne pas confondre avec `components/signal/ToastProvider` :
 *   · SignalToast  = le produit qui parle (S1/S3/S5/S6), règle d'or M4.3
 *                    obligatoire (preuve + micro-action).
 *   · UiToast (ici) = « Copié », « Repo associé », « Sauvegardé »…
 *
 * Les deux piles cohabitent : les toasts système montent en bas à GAUCHE,
 * les Signaux restent en bas à droite. Un Signal ne doit jamais être
 * masqué par un « Copié ✓ ».
 *
 * Interdits M4.7 respectés ici aussi : pas de variante « error » rouge.
 * Un échec s'annonce en ton neutre, avec une issue.
 */

export type UiToastKind = "success" | "info" | "loading" | "magic";

export type UiToastPayload = {
  kind?: UiToastKind;
  message: string;
  /** Précision optionnelle sur une seconde ligne. */
  detail?: string;
  /** ms — `0` = persistant (à fermer via `dismiss`). */
  duration?: number;
};

type Item = UiToastPayload & { id: string };

const Ctx = createContext<{
  toast: (t: UiToastPayload) => string;
  dismiss: (id: string) => void;
}>({ toast: () => "", dismiss: () => {} });

export const useUiToast = () => useContext(Ctx);

const KIND = {
  success: { icon: Check, accent: "text-grow", ring: "ring-grow/35" },
  info: { icon: Info, accent: "text-mist", ring: "ring-line" },
  loading: { icon: Loader2, accent: "text-candle", ring: "ring-candle/30" },
  magic: { icon: Sparkles, accent: "text-candle", ring: "ring-candle/40" },
} as const;

export function UiToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);

  const dismiss = useCallback(
    (id: string) => setItems((p) => p.filter((i) => i.id !== id)),
    []
  );

  const toast = useCallback(
    (t: UiToastPayload) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev.slice(-2), { ...t, id }]);
      const d = t.duration ?? (t.kind === "loading" ? 0 : 3200);
      if (d > 0) setTimeout(() => dismiss(id), d);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-5 z-50 flex w-[min(92vw,20rem)] flex-col gap-2">
        <AnimatePresence>
          {items.map((t) => {
            const k = KIND[t.kind ?? "info"];
            const Icon = k.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: -40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -40, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className={cn(
                  "pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line",
                  "bg-card/95 px-3.5 py-2.5 shadow-lift ring-1 backdrop-blur-sm",
                  k.ring
                )}
              >
                <Icon
                  size={15}
                  strokeWidth={2.4}
                  className={cn(
                    "mt-0.5 shrink-0",
                    k.accent,
                    t.kind === "loading" && "animate-spin"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-snug text-ink">
                    {t.message}
                  </p>
                  {t.detail && (
                    <p className="mt-0.5 text-[11.5px] leading-snug text-muted">
                      {t.detail}
                    </p>
                  )}
                </div>
                {t.kind !== "loading" && (
                  <button
                    onClick={() => dismiss(t.id)}
                    className="shrink-0 rounded p-0.5 text-faint transition hover:text-muted"
                    aria-label="Fermer"
                  >
                    <X size={12} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
