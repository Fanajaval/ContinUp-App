"use client";

import Link from "next/link";
import { ArrowRight, Bell, Hammer, PartyPopper, Trophy, Unlock } from "lucide-react";
import type { Event, Signal, TypeEvent } from "@/lib/contracts";
import { cn, depuis } from "@/lib/utils";

/**
 * M5.3 — bloc « ton activité » : dernière session, briques récentes,
 * rappel du Signal en cours. Le dashboard est un rappel ACTIF (M4.5).
 */

const EVENT_META: Record<TypeEvent, { icon: typeof Hammer; color: string }> = {
  brique: { icon: Hammer, color: "text-grow" },
  retour: { icon: PartyPopper, color: "text-candle" },
  blocage_franchi: { icon: Unlock, color: "text-ember" },
  finition: { icon: Trophy, color: "text-gold" },
};

export default function ActivityBlock({
  events,
  signalEnCours,
}: {
  events: Event[];
  signalEnCours?: Signal;
}) {
  return (
    <aside className="space-y-4">
      {/* ── Rappel du Signal en cours : le cœur battant du dashboard ── */}
      {signalEnCours && (
        <div className="panel relative overflow-hidden border-candle/40 p-4 shadow-candle">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-candle/15 blur-2xl animate-breathe" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-candle animate-flicker" strokeWidth={2.4} />
              <span className="label-xs text-candle">Signal en cours</span>
            </div>
            <p className="mt-2 font-display text-[15px] font-semibold leading-snug text-ink">
              {signalEnCours.contenu.titre}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              {signalEnCours.contenu.preuve_de_progres}
            </p>
            <div className="mt-3 rounded-lg border border-candle/25 bg-candle/[0.07] px-3 py-2">
              <p className="label-xs mb-0.5 text-candle/80">Une seule chose</p>
              <p className="text-[12.5px] leading-snug text-ink">
                {signalEnCours.contenu.micro_action}
              </p>
            </div>
            <Link
              href={signalEnCours.contenu.lien}
              className="mt-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-candle hover:text-candle-soft"
            >
              Reprendre maintenant
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* ── Briques récentes ────────────────────────────────────── */}
      <div className="panel p-4">
        <p className="label-xs mb-3">Ton activité</p>
        <ul className="space-y-3">
          {events.slice(0, 5).map((ev) => {
            const m = EVENT_META[ev.type];
            const Icon = m.icon;
            return (
              <li key={ev.id} className="flex items-start gap-2.5">
                <Icon size={13} className={cn("mt-0.5 shrink-0", m.color)} strokeWidth={2.3} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] text-ink/90">{ev.label}</p>
                  <p className="text-[11px] text-faint">{depuis(ev.date)}</p>
                </div>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-grow">
                  +{ev.xp}
                </span>
              </li>
            );
          })}
        </ul>
        {events.length > 0 && (
          <p className="mt-3 border-t border-line pt-3 text-[11.5px] text-faint">
            Dernière session : {depuis(events[0].date)}
          </p>
        )}
      </div>
    </aside>
  );
}
