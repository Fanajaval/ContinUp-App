"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, PartyPopper, Trophy } from "lucide-react";
import type { ClassementLigne, DashboardResponse } from "@/lib/contracts";
import { getClassement, getDashboard } from "@/lib/api";
import { cn } from "@/lib/utils";
import TopBar from "@/components/layout/TopBar";

/**
 * M6.4 — PAGE CLASSEMENT.
 *
 * ⚠️ POINT DE FRICTION AVEC LE SUJET (cf. risque n°1 du CDC).
 * Le design DOIT rendre évident qu'on ne classe pas le volume produit :
 * la colonne mise en avant est « retours » — le nombre de fois où
 * quelqu'un est revenu après un silence. Le n°1 est le plus résilient,
 * pas le plus productif. C'est l'argumentaire, rendu visuel.
 */

export default function ClassementPage() {
  const [lignes, setLignes] = useState<ClassementLigne[] | null>(null);
  const [data, setData] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    getClassement().then(setLignes);
    getDashboard().then(setData);
  }, []);

  if (!lignes || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }

  const podium = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen">
      <TopBar
        pseudo={data.user.pseudo}
        xp={data.user.xp_total}
        nonLus={data.signaux_actifs.filter((s) => !s.lu).length}
      />

      <main className="mx-auto max-w-2xl px-5 py-8">
        <div className="mb-6 text-center">
          <h1 className="font-display text-[26px] font-bold">
            Les plus résilients
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">
            Ce classement ne mesure pas qui code le plus. Il mesure qui{" "}
            <span className="text-candle">revient</span> et qui{" "}
            <span className="text-gold">finit</span>. Un retour après un
            silence vaut cinq briques.
          </p>
        </div>

        <div className="space-y-2">
          {lignes.map((l, i) => (
            <motion.div
              key={l.pseudo}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                "flex items-center gap-4 rounded-xl border px-4 py-3",
                l.is_me
                  ? "border-candle/60 bg-candle/[0.08] shadow-candle"
                  : "border-line bg-card/70"
              )}
            >
              <span className="w-7 shrink-0 text-center text-[15px] font-bold tabular-nums">
                {podium[l.rang - 1] ?? (
                  <span className="text-faint">{l.rang}</span>
                )}
              </span>

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-candle to-ember text-[12px] font-bold text-night">
                {l.pseudo.charAt(0)}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-[14px] font-semibold",
                    l.is_me && "text-candle"
                  )}
                >
                  {l.pseudo} {l.is_me && <span className="text-[11px] font-normal text-muted">— toi</span>}
                </p>
                {/* La vraie métrique, en clair */}
                <p className="mt-0.5 flex items-center gap-2.5 text-[11.5px] text-muted">
                  <span className="flex items-center gap-1">
                    <PartyPopper size={10} className="text-candle" />
                    {l.retours} retour{l.retours > 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy size={10} className="text-gold" />
                    {l.finitions} fini{l.finitions > 1 ? "s" : ""}
                  </span>
                </p>
              </div>

              <span className="shrink-0 text-[14px] font-bold tabular-nums text-grow">
                {l.xp_total}
                <span className="ml-0.5 text-[10px] font-normal text-faint">XP</span>
              </span>
            </motion.div>
          ))}
        </div>

        <div className="panel mt-6 p-4">
          <p className="label-xs mb-2">Comment on compte</p>
          <ul className="space-y-1 text-[12.5px] text-muted">
            <li>🔥 Revenir après un silence — <span className="text-grow">+5 XP</span></li>
            <li>🏆 Finir un projet — <span className="text-grow">+5 XP</span></li>
            <li>🔓 Franchir un blocage — <span className="text-grow">+3 XP</span></li>
            <li>🧱 Poser une brique — <span className="text-grow">+1 XP</span></li>
          </ul>
          <p className="mt-3 border-t border-line pt-3 text-[12px] text-faint">
            Aucun point ne se perd, jamais. Un silence ne coûte rien.
          </p>
        </div>
      </main>
    </div>
  );
}
