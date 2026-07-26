"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Hammer, Loader2, Plus, RefreshCw } from "lucide-react";
import type { DashboardResponse, Project } from "@/lib/contracts";
import { getDashboard, simulateDay4, syncProjet } from "@/lib/api";
import { prochaineEtape } from "@/lib/templates";
import { heuresDepuis } from "@/lib/utils";
import TopBar from "@/components/layout/TopBar";
import ProjectCard from "@/components/project/ProjectCard";
import ActivityBlock from "@/components/dashboard/ActivityBlock";
import { useToast } from "@/components/signal/ToastProvider";
import OnboardingModal from "@/components/onboarding/OnboardingModal";

/**
 * M5 — DASHBOARD.
 *
 * M5.4 TRI MOTIVATIONNEL : déblocage proche > actif > silencieux avec action.
 * Le projet qu'on peut débloquer en une tâche passe devant. On ne trie
 * jamais par date décroissante : ça punirait l'absence.
 */

/** Salut selon l'heure réelle — « Bonsoir » à 9h faisait faux. */
function salut(): string {
  const h = new Date().getHours();
  if (h < 6) return "Encore debout,";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi,";
  return "Bonsoir";
}

/** Plus le score est bas, plus la card monte. */
function scoreMotivationnel(p: Project): number {
  if (p.statut === "acheve") return 90;
  if (p.statut === "vide") return 70;

  const suivante = prochaineEtape(p.template_type, p.etapes_done);
  const reste = 100 - p.progression;
  // S6 : à moins de 15 % d'une étape majeure → priorité absolue
  const debloqueProche = suivante && reste <= 15;

  if (debloqueProche) return 0;
  if (p.statut === "actif") return 20;
  if (p.statut === "silencieux" && p.prochaine_action) return 40;
  return 60;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { push } = useToast();

  async function refreshDashboard() {
    try {
      setData(await getDashboard());
    } catch {
      setData(null);
    }
  }

  useEffect(() => {
    refreshDashboard();
  }, []);

  const projets = useMemo(() => {
    if (!data) return [];
    return [...data.projects].sort(
      (a, b) => scoreMotivationnel(a) - scoreMotivationnel(b)
    );
  }, [data]);

  const reveDe = (id: string) =>
    data?.reves.find((r) => r.id === id)?.label ?? "Mon rêve";

  const signalEnCours = data?.signaux_actifs.find((s) => !s.lu);
  const nonLus = data?.signaux_actifs.filter((s) => !s.lu).length ?? 0;

  /* ── Démo : Sync → brique → toast S1 (le flux du CP2) ─────────── */
  async function handleSync() {
    const cible = projets.find((p) => p.statut === "actif") ?? projets[0];
    if (!cible || !data) return;
    setBusy("sync");
    await syncProjet(cible.id);

    const suivante = prochaineEtape(cible.template_type, cible.etapes_done);
    if (suivante) {
      setData({
        ...data,
        projects: data.projects.map((p) =>
          p.id === cible.id
            ? {
                ...p,
                etapes_done: [...p.etapes_done, suivante.id],
                progression: Math.min(100, p.progression + 12),
                etape_semantique: suivante.label,
                statut: "actif",
                derniere_activite: new Date().toISOString(),
                xp_projet: p.xp_projet + 1,
              }
            : p
        ),
        user: { ...data.user, xp_total: data.user.xp_total + 1 },
      });
      push({
        declencheur: "S1",
        style: data.user.style_signal,
        titre: `${suivante.label} 🧱`,
        preuve: `${cible.repo_nom} avance. Une brique de plus dans ${reveDe(cible.reve_id)}.`,
        microAction: cible.prochaine_action ?? "Continue sur ta lancée (20 min)",
        xp: 1,
      });
    }
    setBusy(null);
  }

  /* ── Démo : simulate-day4 → toast S3 (le joyau) ───────────────── */
  async function handleDay4() {
    const cible = projets.find((p) => p.statut === "silencieux");
    if (!cible || !data) return;
    setBusy("day4");
    await simulateDay4(cible.id);
    const sig = data.signaux_actifs.find((s) => s.declencheur === "S3");
    push({
      declencheur: "S3",
      style: data.user.style_signal,
      titre: sig?.contenu.titre ?? `${reveDe(cible.reve_id)} t'attend`,
      preuve:
        sig?.contenu.preuve_de_progres ??
        `Tu es déjà à ${cible.progression} % : ${cible.etape_semantique}.`,
      microAction: sig?.contenu.micro_action ?? cible.prochaine_action ?? "",
    });
    setBusy(null);
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">On rallume les chantiers…</span>
      </div>
    );
  }

  const enChantier = data.projects.filter((p) => p.statut !== "acheve").length;
  const acheves = data.projects.filter((p) => p.statut === "acheve").length;

  return (
    <div className="min-h-screen">
      <TopBar pseudo={data.user.pseudo} xp={data.user.xp_total} nonLus={nonLus} />

      <main className="mx-auto max-w-6xl px-5 py-8">
        {/* ── En-tête ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-7 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-[28px] font-bold leading-tight">
              {salut()} {data.user.pseudo}.
            </h1>
            <p className="mt-1 text-[14px] text-muted">
              {enChantier} chantier{enChantier > 1 ? "s" : ""} en cours
              {acheves > 0 && ` · ${acheves} rêve${acheves > 1 ? "s" : ""} accompli${acheves > 1 ? "s" : ""} 🏆`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Boutons de démo — retirer en prod, indispensables au pitch */}
            <button onClick={handleSync} disabled={!!busy} className="btn-ghost">
              {busy === "sync" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              Sync
            </button>
            <button onClick={handleDay4} disabled={!!busy} className="btn-ghost">
              {busy === "day4" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Bell size={13} />
              )}
              Simuler J+4
            </button>
            <button onClick={() => setShowOnboarding(true)} className="btn-primary">
              <Plus size={14} />
              Nouveau chantier
            </button>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          {/* ── Grille des cards ───────────────────────────────── */}
          <div>
            {projets.length === 0 ? (
              <div className="panel flex flex-col items-center gap-3 p-12 text-center">
                <Hammer size={26} className="text-candle" />
                <p className="font-display text-lg font-semibold">
                  Aucun chantier encore.
                </p>
                <p className="max-w-sm text-sm text-muted">
                  Associe un repo — même vide, même à moitié fini. C'est
                  justement pour ceux-là qu'on est là.
                </p>
                <button onClick={() => setShowOnboarding(true)} className="btn-primary mt-1">
                  Commencer
                </button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {projets.map((p, i) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    reveLabel={reveDe(p.reve_id)}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Colonne activité ───────────────────────────────── */}
          <ActivityBlock
            events={data.events_recents}
            signalEnCours={signalEnCours}
          />
        </div>
      </main>

      {/* Pop-up Modale d'Onboarding */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          refreshDashboard();
        }}
      />
    </div>
  );
}
