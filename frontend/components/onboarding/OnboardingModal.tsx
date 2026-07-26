"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Github,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import type { StyleSignal, TemplateType } from "@/lib/contracts";
import { PREVIEW_S3, STYLE_META } from "@/lib/mock";
import { TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { analyzeProject, createProject } from "@/lib/api";
import DreamProgress from "@/components/dream/DreamProgress";

const CHIPS: { label: string; template: TemplateType }[] = [
  { label: "Ma maison", template: "maison" },
  { label: "Une villa de vacances", template: "villa" },
  { label: "Ma première voiture", template: "voiture" },
  { label: "Un centre d'aide", template: "centre_aide" },
  { label: "Voyager le monde", template: "generique" },
  { label: "Mon studio de musique", template: "generique" },
  { label: "Lancer ma boîte", template: "generique" },
  { label: "Une bibliothèque", template: "generique" },
];

const STYLES: StyleSignal[] = ["sarcastique", "motivant", "epique", "gamer"];

interface OnboardingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function OnboardingModal({
  isOpen = true,
  onClose,
}: OnboardingModalProps) {
  const router = useRouter();
  const [etape, setEtape] = useState(0);
  const [repo, setRepo] = useState("");
  const [reves, setReves] = useState<string[]>([]);
  const [libre, setLibre] = useState("");
  const [style, setStyle] = useState<StyleSignal>("motivant");
  const [reveChoisi, setReveChoisi] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  // Sélectionne par défaut le premier rêve ajouté si aucun n'est encore choisi
  useEffect(() => {
    if (reves.length > 0 && !reveChoisi) {
      setReveChoisi(reves[0]);
    }
  }, [reves, reveChoisi]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.push("/dashboard");
    }
  };

  const toggle = (l: string) => {
    setReves((p) => {
      const next = p.includes(l) ? p.filter((x) => x !== l) : [...p, l];
      if (!next.includes(reveChoisi ?? "")) {
        setReveChoisi(next[0] ?? null);
      }
      return next;
    });
  };

  const ajouterLibre = () => {
    const v = libre.trim();
    if (v && !reves.includes(v)) {
      setReves((p) => [...p, v]);
      if (!reveChoisi) setReveChoisi(v);
    }
    setLibre("");
  };

  const templateDe = (label: string): TemplateType =>
    CHIPS.find((c) => c.label === label)?.template ?? "generique";

  async function terminer() {
    setEnvoi(true);
    setErreur("");
    try {
      const project = await createProject({
        repo_url: repo.trim(),
        dreams: reves,
        selected_dream: reveChoisi || "",
        template_type: templateDe(reveChoisi || ""),
      });
      // L'analyse est volontairement best-effort : la création du chantier
      // reste possible même si le service IA est temporairement arrêté.
      await analyzeProject(project.id).catch(() => undefined);
      if (onClose) {
        onClose();
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Impossible de créer le chantier");
    } finally {
      setEnvoi(false);
    }
  }

  // Étape 0 (Repo) -> repo > 3 caractères
  // Étape 1 (Rêves) -> reves.length > 0 et un rêve sélectionné
  // Étape 2 (Style) -> toujours prêt
  const peutAvancer = [
    repo.trim().length > 3,
    reves.length > 0 && !!reveChoisi,
    true,
  ][etape];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-night/80 backdrop-blur-md overflow-y-auto">
      {/* Pop-up Modale Centrée */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="panel relative w-full max-w-2xl overflow-hidden rounded-3xl border border-line/80 bg-card/95 p-6 sm:p-10 shadow-2xl shadow-candle/10 my-auto"
      >
        {/* Barre de progression de la pop-up */}
        <div className="absolute inset-x-0 top-0 h-1 bg-surface">
          <motion.div
            className="h-full bg-gradient-to-r from-candle-deep to-candle"
            animate={{ width: `${((etape + 1) / 3) * 100}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
          />
        </div>

        {/* Bouton Fermer (Pop-up) */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full text-muted hover:text-ink hover:bg-surface/80 transition-colors"
          title="Fermer"
        >
          <X size={18} />
        </button>

        <AnimatePresence mode="wait">
          {/* ══════════ ÉTAPE 1 SUR 3 — LE REPO (Placé au début 1/3) ══════════ */}
          {etape === 0 && (
            <motion.div
              key="repo"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <p className="label-xs mb-2">Étape 1 sur 3 · 30 secondes</p>
              <h1 className="font-display text-[28px] sm:text-[32px] font-bold leading-tight">
                Quel repo va bâtir ce rêve&nbsp;?
              </h1>
              <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-muted">
                Vide, à moitié fini, abandonné depuis trois mois — aucune
                importance. C'est exactement pour ceux-là qu'on existe.
              </p>

              <div className="mt-6 flex items-center gap-2 rounded-xl border border-line bg-surface/70 px-4 py-3 focus-within:border-candle/50">
                <Github size={16} className="shrink-0 text-faint" />
                <input
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="github.com/toi/ton-projet"
                  className="flex-1 bg-transparent font-mono text-[13.5px] text-ink placeholder:text-faint focus:outline-none"
                />
              </div>
              <p className="mt-2 text-[12px] text-faint">
                Pas de docs dans le repo ? L'IA les génère. Jamais bloquant.
              </p>
            </motion.div>
          )}

          {/* ══════════ ÉTAPE 2 SUR 3 — MES RÊVES ══════════ */}
          {etape === 1 && (
            <motion.div
              key="reves"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <p className="label-xs mb-2">Étape 2 sur 3 · 60 secondes</p>
              <h1 className="font-display text-[28px] sm:text-[32px] font-bold leading-tight">
                Qu'est-ce que tu veux bâtir dans ta vie&nbsp;?
              </h1>
              <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-muted">
                Choisis ce qui te parle. Ton repo <span className="font-mono text-candle text-xs font-semibold">{repo || "GitHub"}</span> construira ces rêves-là.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {CHIPS.map((c) => {
                  const on = reves.includes(c.label);
                  return (
                    <button
                      key={c.label}
                      onClick={() => toggle(c.label)}
                      className={cn("chip text-[13.5px]", on && "chip-on")}
                    >
                      <span>{TEMPLATES[c.template].emoji}</span>
                      {c.label}
                      {on && <Check size={13} />}
                    </button>
                  );
                })}
                {reves
                  .filter((r) => !CHIPS.some((c) => c.label === r))
                  .map((r) => (
                    <button
                      key={r}
                      onClick={() => toggle(r)}
                      className="chip chip-on text-[13.5px]"
                    >
                      ✨ {r} <Check size={13} />
                    </button>
                  ))}
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  value={libre}
                  onChange={(e) => setLibre(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ajouterLibre()}
                  placeholder="Un autre rêve, à toi… (optionnel)"
                  className="flex-1 rounded-xl border border-line bg-surface/70 px-4 py-2.5
                             text-sm text-ink placeholder:text-faint focus:border-candle/50"
                />
                <button onClick={ajouterLibre} className="btn-ghost">
                  <Plus size={14} />
                </button>
              </div>

              {reves.length > 0 && (
                <div className="mt-5">
                  <p className="label-xs mb-2">Ce repo construit principalement…</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {reves.map((r) => {
                      const t = templateDe(r);
                      const on = reveChoisi === r;
                      return (
                        <button
                          key={r}
                          onClick={() => setReveChoisi(r)}
                          className={cn(
                            "flex items-center gap-3 overflow-hidden rounded-xl border p-2 text-left transition-all",
                            on
                              ? "border-candle/70 bg-candle/[0.08] shadow-candle"
                              : "border-line bg-surface/50 hover:border-mist/40"
                          )}
                        >
                          <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg">
                            <DreamProgress
                              type={t}
                              etapesDone={["terrain"]}
                              still
                              className="h-full w-full"
                            />
                          </div>
                          <span
                            className={cn(
                              "truncate text-[13px] font-medium",
                              on ? "text-candle" : "text-ink"
                            )}
                          >
                            {TEMPLATES[t].emoji} {r}
                          </span>
                          {on && <Check size={14} className="ml-auto mr-1.5 shrink-0 text-candle" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ══════════ ÉTAPE 3 SUR 3 — LE STYLE ══════════ */}
          {etape === 2 && (
            <motion.div
              key="style"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <p className="label-xs mb-2">Étape 3 sur 3 · 30 secondes</p>
              <h1 className="font-display text-[28px] sm:text-[32px] font-bold leading-tight">
                Quand tu te tais, on te parle comment&nbsp;?
              </h1>
              <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-muted">
                Au 4ᵉ jour de silence, on vient te chercher. À toi de choisir
                le ton.
              </p>

              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {STYLES.map((s) => {
                  const m = STYLE_META[s];
                  const on = style === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={cn(
                        "rounded-xl border p-3.5 text-left transition-all",
                        on
                          ? "border-candle/70 bg-candle/[0.08] shadow-candle"
                          : "border-line bg-surface/50 hover:border-mist/40"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{m.emoji}</span>
                        <span
                          className={cn(
                            "text-[14px] font-semibold",
                            on ? "text-candle" : "text-ink"
                          )}
                        >
                          {m.nom}
                        </span>
                        {on && <Check size={14} className="ml-auto text-candle" />}
                      </div>
                      <p className="mt-1 text-[12.5px] text-muted">{m.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="panel mt-5 overflow-hidden border-candle/30">
                <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
                  <Sparkles size={12} className="text-candle animate-flicker" />
                  <span className="label-xs text-candle">
                    Aperçu · ton Signal du 4ᵉ jour
                  </span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={style}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 py-3.5 text-[14px] leading-relaxed text-ink/90"
                  >
                    « {PREVIEW_S3[style]} »
                  </motion.p>
                </AnimatePresence>
              </div>
              {erreur && <p className="mt-3 text-sm text-ember">{erreur}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Navigation ────────────────────────────────────────── */}
        <div className="mt-9 flex items-center justify-between">
          <button
            onClick={() => setEtape((e) => Math.max(0, e - 1))}
            className={cn("btn-ghost", etape === 0 && "invisible")}
          >
            <ArrowLeft size={14} /> Retour
          </button>

          {etape < 2 ? (
            <button
              onClick={() => setEtape((e) => e + 1)}
              disabled={!peutAvancer}
              className="btn-primary"
            >
              Continuer <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={terminer}
              disabled={!peutAvancer || envoi}
              className="btn-primary"
            >
              {envoi ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  L'IA analyse ton repo…
                </>
              ) : (
                <>
                  Ouvrir le chantier <ArrowRight size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
