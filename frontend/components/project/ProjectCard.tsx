"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Flame, Github, Sparkles, Trophy, Zap } from "lucide-react";
import type { Project } from "@/lib/contracts";
import { etapeCouranteLabel, getTemplate, prochaineEtape } from "@/lib/templates";
import { cn, depuis } from "@/lib/utils";
import DreamProgress from "@/components/dream/DreamProgress";
import ProgressBar from "@/components/ui/ProgressBar";

/**
 * M5.1 — LA CARD. Livrable CP2, « intouchable » selon la fiche B.
 *
 * Trio complet exigé par le CDC point 5 :
 *   miniature du rêve + barre classique + ÉTAPE SÉMANTIQUE + micro-action + XP
 *
 * Interdits M4.7 respectés : aucun rouge, aucun compteur de retard,
 * aucune card grisée. Le projet silencieux est le plus BEAU de la grille :
 * sa fenêtre est allumée.
 */

/**
 * `accent`  → texte sur le corps de la card : suit le thème.
 * `onScene` → texte posé sur la vignette nocturne : couleur FIXE,
 *             sinon il disparaît en thème clair.
 */
const ETATS = {
  actif: {
    emoji: "🔥",
    mot: "En chantier",
    icon: Flame,
    accent: "text-grow",
    onScene: "text-[#4ADE9B]",
    border: "border-grow/25 hover:border-grow/50",
    glow: "hover:shadow-grow",
    tone: "grow" as const,
  },
  silencieux: {
    emoji: "🕯️",
    mot: "La lumière est restée allumée",
    icon: Sparkles,
    accent: "text-candle",
    onScene: "text-[#F5B841]",
    border: "border-candle/35 hover:border-candle/70",
    glow: "shadow-candle hover:shadow-candle-lg",
    tone: "candle" as const,
  },
  acheve: {
    emoji: "🏆",
    mot: "Rêve accompli",
    icon: Trophy,
    accent: "text-gold",
    onScene: "text-[#FFD277]",
    border: "border-gold/40 hover:border-gold/70",
    glow: "shadow-gold",
    tone: "gold" as const,
  },
  vide: {
    emoji: "🌱",
    mot: "Le terrain t'attend",
    icon: Sparkles,
    accent: "text-mist",
    onScene: "text-[#A8BCD8]",
    border: "border-line hover:border-mist/50",
    glow: "",
    tone: "grow" as const,
  },
} as const;

export default function ProjectCard({
  project,
  reveLabel,
  index = 0,
}: {
  project: Project;
  reveLabel: string;
  index?: number;
}) {
  const e = ETATS[project.statut];
  const Icon = e.icon;
  const tpl = getTemplate(project.template_type);
  const silencieux = project.statut === "silencieux";
  const acheve = project.statut === "acheve";
  const suivante = prochaineEtape(project.template_type, project.etapes_done);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 130, damping: 18 }}
    >
      <Link
        href={`/projet/${project.id}`}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card",
          "transition-all duration-300 hover:-translate-y-1",
          e.border,
          e.glow
        )}
      >
        {/* ── Miniature du rêve : l'état réel du template ─────────── */}
        <div className="relative aspect-[4/3] overflow-hidden bg-[#080B14]">
          <DreamProgress
            type={project.template_type}
            etapesDone={project.etapes_done}
            candle={silencieux}
            gold={acheve}
            still
            className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
          />

          {/* Voile de nuit sur le silencieux : la bougie ressort */}
          {silencieux && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
          )}

          {/* ⚠️ Tout ce qui est POSÉ SUR LA SCÈNE garde des couleurs fixes :
              la vignette reste nocturne dans les deux thèmes, donc un
              `text-ink` y deviendrait invisible en mode clair. */}

          {/* Badge d'état */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 backdrop-blur-sm">
            <Icon size={12} className={e.onScene} strokeWidth={2.4} />
            <span className={cn("text-[11px] font-semibold", e.onScene)}>
              {e.emoji} {e.mot}
            </span>
          </div>

          {/* XP du projet */}
          {project.xp_projet > 0 && (
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-white/15 bg-black/55 px-2 py-1 backdrop-blur-sm">
              <Zap size={11} className="text-[#4ADE9B]" strokeWidth={2.6} />
              <span className="text-[11px] font-semibold tabular-nums text-[#4ADE9B]">
                {project.xp_projet}
              </span>
            </div>
          )}

          {/* Le rêve visé, en bas de la vignette */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-1.5">
            <span className="text-sm">{tpl.emoji}</span>
            <span className="truncate text-[12px] font-medium text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
              {reveLabel}
            </span>
          </div>
        </div>

        {/* ── Corps ───────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <Github size={13} className="shrink-0 text-faint" />
            <span className="truncate font-mono text-[12.5px] text-muted">
              {project.repo_nom}
            </span>
            {/* Jamais « en retard » : juste un repère temporel neutre */}
            <span className="ml-auto shrink-0 text-[11px] text-faint">
              {depuis(project.derniere_activite)}
            </span>
          </div>

          {/* NF4 : la barre porte toujours son étape sémantique */}
          <ProgressBar
            value={project.progression}
            etape={etapeCouranteLabel(project.template_type, project.etapes_done)}
            tone={e.tone}
            size="sm"
          />

          {/* Micro-action ou couronnement */}
          {acheve ? (
            <div className="mt-auto rounded-lg border border-gold/25 bg-gold/[0.07] px-3 py-2">
              <p className="text-[12.5px] font-medium text-gold">
                🏆 {tpl.nom} — construite jusqu'au bout.
              </p>
            </div>
          ) : (
            <div className="mt-auto space-y-2">
              {suivante && (
                <p className="text-[11.5px] italic text-faint">
                  {suivante.indice}
                </p>
              )}
              {project.prochaine_action && (
                <div
                  className={cn(
                    "rounded-lg border px-3 py-2 transition-colors",
                    silencieux
                      ? "border-candle/30 bg-candle/[0.07]"
                      : "border-line bg-surface/60"
                  )}
                >
                  <p className="label-xs mb-1">Prochaine action · ~20 min</p>
                  <p className="line-clamp-2 text-[12.5px] leading-snug text-ink/90">
                    {project.prochaine_action}
                  </p>
                </div>
              )}
            </div>
          )}

          <div
            className={cn(
              "flex items-center gap-1.5 text-[12px] font-medium transition-all",
              e.accent,
              "opacity-0 group-hover:opacity-100"
            )}
          >
            {silencieux ? "Rallumer le chantier" : acheve ? "Revoir le rêve" : "Continuer"}
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
