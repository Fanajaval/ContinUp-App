"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  Hammer,
  Loader2,
  Mail,
  PartyPopper,
  Smartphone,
  Sparkles,
} from "lucide-react";
import type { DashboardResponse, Declencheur } from "@/lib/contracts";
import { getDashboard } from "@/lib/api";
import { STYLE_META } from "@/lib/mock";
import { cn, depuis } from "@/lib/utils";
import TopBar from "@/components/layout/TopBar";

/**
 * M4.5 — ONGLET SIGNAUX : l'historique consultable.
 * Chaque entrée montre la règle d'or M4.3 appliquée :
 * preuve de progrès + micro-action + lien direct.
 */

const META: Record<
  Declencheur,
  { icon: typeof Bell; nom: string; accent: string; bg: string }
> = {
  S1: { icon: Hammer, nom: "Brique posée", accent: "text-grow", bg: "border-grow/25" },
  S3: { icon: Bell, nom: "Signal du 4ᵉ jour", accent: "text-candle", bg: "border-candle/40" },
  S5: { icon: PartyPopper, nom: "Retour célébré", accent: "text-gold", bg: "border-gold/30" },
  S6: { icon: Sparkles, nom: "Déblocage proche", accent: "text-candle-soft", bg: "border-candle/20" },
};

export default function SignauxPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    getDashboard().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }

  const signaux = [...data.signaux_actifs].sort(
    (a, b) => +new Date(b.envoye_le) - +new Date(a.envoye_le)
  );
  const nonLus = signaux.filter((s) => !s.lu).length;

  return (
    <div className="min-h-screen">
      <TopBar pseudo={data.user.pseudo} xp={data.user.xp_total} nonLus={nonLus} />

      <main className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-6">
          <h1 className="font-display text-[26px] font-bold">Tes Signaux</h1>
          <p className="mt-1 text-[14px] text-muted">
            Ton style :{" "}
            <span className="text-candle">
              {STYLE_META[data.user.style_signal].emoji}{" "}
              {STYLE_META[data.user.style_signal].nom}
            </span>{" "}
            · Tout signal porte une preuve de ton progrès et une seule action.
          </p>
        </div>

        <div className="space-y-3">
          {signaux.map((s, i) => {
            const m = META[s.declencheur];
            const Icon = m.icon;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={cn(
                  "panel border p-4",
                  m.bg,
                  !s.lu && "shadow-candle"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 shrink-0", m.accent)}>
                    <Icon size={17} strokeWidth={2.3} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("label-xs", m.accent)}>{m.nom}</span>
                      <span className="flex items-center gap-1 rounded-full border border-line px-1.5 py-0.5 text-[10px] text-faint">
                        {s.canal === "email" ? (
                          <>
                            <Mail size={9} /> email
                          </>
                        ) : (
                          <>
                            <Smartphone size={9} /> in-app
                          </>
                        )}
                      </span>
                      <span className="text-[11px] text-faint">
                        {depuis(s.envoye_le)}
                      </span>
                      {!s.lu && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-candle" />
                      )}
                    </div>

                    <p className="mt-1.5 font-display text-[16px] font-semibold leading-snug">
                      {s.contenu.titre}
                    </p>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                      {s.contenu.preuve_de_progres}
                    </p>

                    <div className="mt-3 rounded-lg border border-line bg-surface/60 px-3 py-2">
                      <p className="label-xs mb-0.5">Une seule action</p>
                      <p className="text-[13px] leading-snug text-ink">
                        {s.contenu.micro_action}
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center gap-3">
                      <Link
                        href={s.contenu.lien}
                        className={cn(
                          "flex items-center gap-1.5 text-[12.5px] font-semibold",
                          m.accent
                        )}
                      >
                        Ouvrir {s.project_nom}
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[12px] text-faint">
          Maximum 1 signal par jour et par projet. On te rappelle, on ne te
          harcèle pas.
        </p>
      </main>
    </div>
  );
}
