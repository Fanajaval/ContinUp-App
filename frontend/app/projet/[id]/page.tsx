"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Circle,
  Github,
  Loader2,
  PartyPopper,
  RefreshCw,
} from "lucide-react";
import type { DashboardResponse, Project } from "@/lib/contracts";
import { getDashboard, syncProjet } from "@/lib/api";
import { getTemplate, prochaineEtape } from "@/lib/templates";
import { cn, depuis } from "@/lib/utils";
import TopBar from "@/components/layout/TopBar";
import DreamProgress from "@/components/dream/DreamProgress";
import ProgressBar from "@/components/ui/ProgressBar";
import { useToast } from "@/components/signal/ToastProvider";

/**
 * PAGE PROJET — le rêve en grand.
 *
 * M4.1 / S5 : rouvrir un projet silencieux déclenche la CÉLÉBRATION du
 * retour. Jamais « ça fait 4 jours ». Toujours « te revoilà ».
 * C'est le moment le plus important de tout le produit.
 */

export default function ProjetPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [projet, setProjet] = useState<Project | null>(null);
  const [sync, setSync] = useState(false);
  const [retour, setRetour] = useState(false);
  const dejaCelebre = useRef(false);
  const { push } = useToast();

  useEffect(() => {
    getDashboard().then((d) => {
      setData(d);
      const p = d.projects.find((x) => x.id === id) ?? d.projects[0];
      setProjet(p);

      // ── S5 : célébration du retour ──────────────────────────
      if (p?.statut === "silencieux" && !dejaCelebre.current) {
        dejaCelebre.current = true;
        setTimeout(() => {
          setRetour(true);
          push({
            declencheur: "S5",
            style: d.user.style_signal,
            titre: "Te revoilà. On reprend exactement où tu t'es arrêtée.",
            preuve: `Ton chantier t'a attendue, lumière allumée. ${p.progression} % étaient déjà debout : ${p.etape_semantique}.`,
            microAction: p.prochaine_action ?? "Reprends par la plus petite chose (15 min)",
            xp: 5,
          });
        }, 700);
      }
    });
  }, [id, push]);

  async function handleSync() {
    if (!projet || !data) return;
    setSync(true);
    await syncProjet(projet.id);
    const suivante = prochaineEtape(projet.template_type, projet.etapes_done);
    if (suivante) {
      setProjet({
        ...projet,
        etapes_done: [...projet.etapes_done, suivante.id],
        progression: Math.min(100, projet.progression + 12),
        etape_semantique: suivante.label,
        statut: "actif",
        xp_projet: projet.xp_projet + 1,
        derniere_activite: new Date().toISOString(),
      });
      push({
        declencheur: "S1",
        style: data.user.style_signal,
        titre: `${suivante.label} 🧱`,
        preuve: `Une brique de plus. ${projet.repo_nom} avance vraiment.`,
        microAction: projet.prochaine_action ?? "Enchaîne tant que c'est chaud (20 min)",
        xp: 1,
      });
    }
    setSync(false);
  }

  if (!data || !projet) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }

  const tpl = getTemplate(projet.template_type);
  const reve = data.reves.find((r) => r.id === projet.reve_id);
  const silencieux = projet.statut === "silencieux";
  const acheve = projet.statut === "acheve";
  const suivante = prochaineEtape(projet.template_type, projet.etapes_done);
  const events = data.events_recents.filter((e) => e.project_id === projet.id);

  return (
    <div className="min-h-screen">
      <TopBar
        pseudo={data.user.pseudo}
        xp={data.user.xp_total}
        nonLus={data.signaux_actifs.filter((s) => !s.lu).length}
      />

      {/* ── Bandeau S5 : la célébration du retour ─────────────── */}
      <AnimatePresence>
        {retour && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-candle/30 bg-candle/[0.09]"
          >
            <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3">
              <PartyPopper size={17} className="shrink-0 text-candle" />
              <p className="text-[13.5px] text-ink">
                <span className="font-semibold text-candle">Te revoilà.</span>{" "}
                Ton chantier a gardé la lumière allumée. Rien n'a été perdu.
              </p>
              <span className="ml-auto shrink-0 rounded-full bg-grow/15 px-2 py-0.5 text-[11px] font-bold text-grow">
                +5 XP
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-5xl px-5 py-7">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          {/* ── Le rêve en grand ──────────────────────────────── */}
          <div>
            <div
              className={cn(
                "overflow-hidden rounded-2xl border bg-[#080B14]",
                acheve ? "border-gold/40 shadow-gold" : silencieux ? "border-candle/40 shadow-candle" : "border-line"
              )}
            >
              <DreamProgress
                type={projet.template_type}
                etapesDone={projet.etapes_done}
                candle={silencieux}
                gold={acheve}
                className="w-full"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-[22px] font-bold leading-tight">
                  {tpl.emoji} {reve?.label ?? tpl.nom}
                </h1>
                <a
                  href={projet.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex items-center gap-1.5 font-mono text-[12.5px] text-muted hover:text-ink"
                >
                  <Github size={12} /> {projet.repo_nom}
                  <span className="text-faint">· {depuis(projet.derniere_activite)}</span>
                </a>
              </div>
              {!acheve && (
                <button onClick={handleSync} disabled={sync} className="btn-primary">
                  {sync ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Sync le repo
                </button>
              )}
            </div>

            <div className="mt-4">
              <ProgressBar
                value={projet.progression}
                etape={projet.etape_semantique}
                tone={acheve ? "gold" : silencieux ? "candle" : "grow"}
              />
            </div>

            {/* Prochaine micro-action, mise en scène */}
            {!acheve && projet.prochaine_action && (
              <div
                className={cn(
                  "mt-4 rounded-xl border p-4",
                  silencieux ? "border-candle/35 bg-candle/[0.07]" : "border-line bg-surface/60"
                )}
              >
                <p className="label-xs mb-1.5">
                  Ta prochaine action · environ 20 minutes
                </p>
                <p className="text-[14.5px] leading-relaxed text-ink">
                  {projet.prochaine_action}
                </p>
                {suivante && (
                  <p className="mt-2.5 flex items-center gap-1.5 border-t border-line/60 pt-2.5 text-[12.5px] italic text-candle/90">
                    <ArrowRight size={12} /> {suivante.indice}
                  </p>
                )}
              </div>
            )}

            {acheve && (
              <div className="shine mt-4 rounded-xl border border-gold/30 bg-gold/[0.06] p-4">
                <p className="font-display text-[16px] font-semibold text-gold">
                  🏆 {tpl.nom} — construite jusqu'au bout.
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  Tu as commencé ce repo, et tu l'as fini. C'est plus rare que
                  tu ne crois.
                </p>
              </div>
            )}
          </div>

          {/* ── Colonne : les étapes du template ──────────────── */}
          <aside className="space-y-4">
            <div className="panel p-4">
              <p className="label-xs mb-3">Les étapes de {tpl.nom.toLowerCase()}</p>
              <ol className="space-y-2.5">
                {tpl.etapes.map((e) => {
                  const fait = projet.etapes_done.includes(e.id);
                  const cible = suivante?.id === e.id;
                  return (
                    <li key={e.id} className="flex items-center gap-2.5">
                      {fait ? (
                        <Check size={14} className="shrink-0 text-grow" strokeWidth={3} />
                      ) : (
                        <Circle
                          size={14}
                          className={cn("shrink-0", cible ? "text-candle" : "text-faint")}
                        />
                      )}
                      <span
                        className={cn(
                          "text-[13px]",
                          fait ? "text-ink" : cible ? "font-medium text-candle" : "text-faint"
                        )}
                      >
                        {e.label}
                      </span>
                      {cible && (
                        <span className="ml-auto text-[10px] uppercase tracking-wide text-candle/70">
                          à venir
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            {events.length > 0 && (
              <div className="panel p-4">
                <p className="label-xs mb-3">Historique</p>
                <ul className="space-y-2.5">
                  {events.map((ev) => (
                    <li key={ev.id} className="flex items-start gap-2">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-grow" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] text-ink/90">{ev.label}</p>
                        <p className="text-[11px] text-faint">{depuis(ev.date)}</p>
                      </div>
                      <span className="text-[11px] font-semibold text-grow">+{ev.xp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
