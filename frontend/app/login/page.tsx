"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Github, Loader2, Mail, ShieldCheck } from "lucide-react";
import DreamProgress from "@/components/dream/DreamProgress";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { useUiToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";

/**
 * M1.1 — AUTHENTIFICATION.
 *
 * OAuth GitHub en voie royale (il fait d'une pierre deux coups :
 * compte + accès aux repos), email en repli — conforme à la décision
 * ferme H+5:30 de C : si l'OAuth ne passe pas, l'email reste debout et
 * l'association de repo se fait par URL publique.
 *
 * La promesse du produit est affichée ici, pas seulement le formulaire :
 * c'est le premier écran, il doit dire pourquoi on est différent.
 */

export default function LoginPage() {
  const router = useRouter();
  const { toast, dismiss } = useUiToast();
  const [mode, setMode] = useState<"github" | "email">("github");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<null | "github" | "email">(null);

  async function loginGithub() {
    setBusy("github");
    const id = toast({
      kind: "loading",
      message: "Connexion à GitHub…",
      detail: "Redirection vers l'autorisation OAuth",
    });
    // C livre `/api/auth/github` — mock ici, le front n'attend personne.
    await new Promise((r) => setTimeout(r, 1200));
    dismiss(id);
    toast({ kind: "success", message: "Compte GitHub connecté" });
    router.push("/onboarding");
  }

  async function loginEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast({
        kind: "info",
        message: "Il manque une adresse valide",
        detail: "Par exemple : prenom@exemple.mg",
      });
      return;
    }
    setBusy("email");
    const id = toast({ kind: "loading", message: "Envoi du lien magique…" });
    await new Promise((r) => setTimeout(r, 1100));
    dismiss(id);
    toast({
      kind: "magic",
      message: "Lien envoyé",
      detail: `Vérifie ${email} — le lien te connecte en un clic.`,
      duration: 5000,
    });
    setBusy(null);
    router.push("/onboarding");
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute right-5 top-5 z-10">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-10 px-5 py-12 lg:grid-cols-2">
        {/* ── Colonne gauche : la promesse ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="order-2 lg:order-1"
        >
          <div className="mb-5 flex items-center gap-2">
            <span className="text-xl">🕯️</span>
            <span className="font-display text-[17px] font-bold">
              Le Quatrième Jour
            </span>
          </div>

          <h1 className="font-display text-[34px] font-bold leading-[1.15]">
            Ton repo construit
            <br />
            ta vie rêvée.
          </h1>

          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
            Chaque commit pose une brique. Et le jour où tu t'arrêtes, ce
            n'est pas toi qui dois revenir tout seul —{" "}
            <span className="text-candle">c'est l'app qui vient te chercher</span>
            , avec la preuve de ce que tu as déjà bâti.
          </p>

          <ul className="mt-6 space-y-2.5">
            {[
              ["🧱", "Tes commits font monter les murs, vraiment"],
              ["🕯️", "Un projet en pause garde sa lumière allumée"],
              ["🔔", "Au 4ᵉ jour de silence, un signal et une seule action"],
            ].map(([e, t]) => (
              <li key={t} className="flex items-start gap-2.5 text-[13.5px] text-ink/85">
                <span className="mt-px">{e}</span>
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-7 hidden overflow-hidden rounded-xl border border-line sm:block">
            <DreamProgress
              type="maison"
              etapesDone={["terrain", "fondations", "murs", "toit", "fenetres"]}
              candle
              still
              className="w-full"
            />
          </div>
        </motion.div>

        {/* ── Colonne droite : le formulaire ────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="order-1 lg:order-2"
        >
          <div className="panel p-6 shadow-lift">
            <h2 className="font-display text-[20px] font-bold">
              Ouvre ton chantier
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Trois minutes, et ton premier rêve est posé.
            </p>

            {/* Voie royale : GitHub */}
            <button
              onClick={loginGithub}
              disabled={!!busy}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl
                         bg-ink px-4 py-3 text-[14px] font-semibold text-night
                         transition-all hover:opacity-90 disabled:opacity-50"
            >
              {busy === "github" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Github size={16} />
              )}
              Continuer avec GitHub
            </button>

            <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-snug text-faint">
              <ShieldCheck size={12} className="mt-px shrink-0 text-grow" />
              Lecture seule sur tes dépôts. On lit l'activité, jamais on
              n'écrit dans ton code.
            </p>

            {/* Repli email */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="text-[11px] uppercase tracking-wider text-faint">
                ou
              </span>
              <div className="h-px flex-1 bg-line" />
            </div>

            {mode === "email" ? (
              <form onSubmit={loginEmail}>
                <label className="label-xs mb-1.5 block">Ton email</label>
                <div className="flex items-center gap-2 rounded-xl border border-line bg-surface/70 px-3.5 py-2.5 focus-within:border-candle/50">
                  <Mail size={15} className="shrink-0 text-faint" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom@exemple.mg"
                    autoFocus
                    className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy === "email"}
                  className="btn-primary mt-3 w-full"
                >
                  {busy === "email" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      Recevoir mon lien <ArrowRight size={14} />
                    </>
                  )}
                </button>
                <p className="mt-2 text-center text-[11.5px] text-faint">
                  Aucun mot de passe à retenir.
                </p>
              </form>
            ) : (
              <button
                onClick={() => setMode("email")}
                className="btn-ghost w-full"
              >
                <Mail size={14} />
                Continuer par email
              </button>
            )}

            <p className="mt-5 border-t border-line pt-4 text-center text-[11.5px] leading-relaxed text-faint">
              Pas de repo prêt ? Aucune importance : vide, à moitié fini ou
              abandonné, on part de là où tu en es.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
