"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Github,
  Loader2,
  Lock,
  Mail,
  UserRound,
} from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { useUiToast } from "@/components/ui/ToastProvider";
import { getToken, setSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidGithubUsername(value: string) {
  const username = value.trim().replace(/^@/, "");
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(username);
}

export default function LoginClient() {
  const router = useRouter();
  const { toast, dismiss } = useUiToast();

  // Mode: "login" (Connexion) ou "register" (Création de compte)
  const [mode, setMode] = useState<"login" | "register">("login");

  // Champs de formulaire
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [githubAccount, setGithubAccount] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  // Validation Connexion (Email + Mot de passe)
  const loginReady = isValidEmail(email) && password.length > 0;

  // Validation Inscription (Nom/Prénom + Email + GitHub + Mot de passe)
  const registerReady =
    fullName.trim().length >= 2 &&
    isValidEmail(email) &&
    isValidGithubUsername(githubAccount) &&
    password.trim().length >= 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "login") {
      if (!isValidEmail(email)) {
        toast({ kind: "info", message: "Adresse email invalide" });
        return;
      }
      if (!password) {
        toast({ kind: "info", message: "Mot de passe requis" });
        return;
      }
    } else {
      if (fullName.trim().length < 2) {
        toast({ kind: "info", message: "Veuillez entrer votre nom et prénom(s)" });
        return;
      }
      if (!isValidEmail(email)) {
        toast({ kind: "info", message: "Adresse email invalide" });
        return;
      }
      if (!isValidGithubUsername(githubAccount)) {
        toast({ kind: "info", message: "Compte GitHub invalide" });
        return;
      }
      if (password.trim().length < 6) {
        toast({ kind: "info", message: "Le mot de passe doit contenir au moins 6 caractères" });
        return;
      }
    }

    setBusy(true);
    const loadingId = toast({
      kind: "loading",
      message: mode === "login" ? "Connexion en cours…" : "Création de ton compte…",
    });

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email: email.trim().toLowerCase(), password }
          : {
              name: fullName.trim(),
              email: email.trim().toLowerCase(),
              github_username: githubAccount.trim().replace(/^@/, ""),
              password,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      dismiss(loadingId);

      if (res.ok && data.token) {
        setSession(data.token, {
          id: String(data.user?.id || "u1"),
          name: data.user?.name || fullName.trim() || email.split("@")[0],
          email: email.trim().toLowerCase(),
        });
        toast({
          kind: "success",
          message: mode === "login" ? `Ravi de te revoir !` : `Compte créé avec succès !`,
        });
        router.push("/onboarding");
      } else {
        toast({
          kind: "info",
          message: data.message || "Impossible de terminer l’opération",
        });
      }
    } catch (err) {
      dismiss(loadingId);
      toast({
        kind: "info",
        message: err instanceof Error ? err.message : "Impossible de joindre le serveur",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Halos de lumière en arrière-plan */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 15% 20%, rgb(245 184 65 / 0.14), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgb(74 222 155 / 0.1), transparent 50%), radial-gradient(ellipse 50% 40% at 60% 10%, rgb(124 147 184 / 0.08), transparent 45%)",
        }}
      />

      <div className="absolute right-5 top-5 z-10">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-5xl items-center gap-12 px-5 py-14 lg:grid-cols-2">
        {/* Présentation du produit */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="order-2 lg:order-1"
        >
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-candle/25 bg-candle/10 px-3.5 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-candle opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-candle" />
            </span>
            <span className="text-[12px] font-semibold tracking-wide text-candle">
              Les projets oubliés méritent une seconde chance
            </span>
          </div>

          <p className="font-display text-[15px] font-semibold tracking-[0.08em] text-candle">
            CONTINUP
          </p>

          <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,2.75rem)] font-bold leading-[1.12] text-ink">
            Reprends là où
            <br />
            tu t&apos;étais arrêté.
          </h1>

          <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-muted">
            ContinUp transforme ton repo Git en progression visible — et te
            rappelle, sans pression, quand le silence s&apos;installe. Pas pour
            te juger : pour te redonner l&apos;élan de continuer.
          </p>

          <div className="mt-8 space-y-3 border-l border-candle/30 pl-4">
            {[
              "Un projet à moitié fini n'est pas un échec — c'est une histoire en pause.",
              "Chaque commit allume une brique. Chaque retour compte double.",
            ].map((line) => (
              <p key={line} className="text-[13.5px] leading-relaxed text-ink/80">
                {line}
              </p>
            ))}
          </div>
        </motion.div>

        {/* Panneau Formulaire (Connexion / Inscription) */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="order-1 lg:order-2"
        >
          <div className="panel p-6 shadow-lift sm:p-8">
            {/* Onglets de Basculement : Connexion / Création de compte */}
            <div className="mb-6 flex rounded-xl border border-line bg-surface/60 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={cn(
                  "flex-1 rounded-lg py-2 text-[13.5px] font-semibold transition-all",
                  mode === "login"
                    ? "bg-candle text-night shadow-candle"
                    : "text-muted hover:text-ink"
                )}
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={cn(
                  "flex-1 rounded-lg py-2 text-[13.5px] font-semibold transition-all",
                  mode === "register"
                    ? "bg-candle text-night shadow-candle"
                    : "text-muted hover:text-ink"
                )}
              >
                Créer un compte
              </button>
            </div>

            <div className="mb-5">
              <h2 className="font-display text-[22px] font-bold text-ink">
                {mode === "login" ? "Connexion" : "Créer ton compte"}
              </h2>
              <p className="mt-1 text-[13.5px] leading-snug text-muted">
                {mode === "login"
                  ? "Renseigne ton email et ton mot de passe pour accéder à ton espace."
                  : "Complète les informations ci-dessous pour ouvrir ton chantier."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <AnimatePresence mode="wait">
                {/* ══════════ SEULEMENT EN MODE CRÉATION DE COMPTE ══════════ */}
                {mode === "register" && (
                  <motion.div
                    key="register-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Nom et prénoms */}
                    <div>
                      <label
                        htmlFor="continup-fullname"
                        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink"
                      >
                        Nom et Prénoms *
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-line/80 bg-surface/60 px-3.5 py-2.5 focus-within:border-candle/50">
                        <UserRound size={15} className="shrink-0 text-faint" />
                        <input
                          id="continup-fullname"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Jean Dupont"
                          autoComplete="name"
                          className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint/80 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Compte GitHub associé */}
                    <div>
                      <label
                        htmlFor="continup-github-acc"
                        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink"
                      >
                        Compte GitHub associé *
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-line/80 bg-surface/60 px-3.5 py-2.5 focus-within:border-candle/50">
                        <Github size={15} className="shrink-0 text-faint" />
                        <span className="text-[13.5px] text-faint font-mono">github.com/</span>
                        <input
                          id="continup-github-acc"
                          type="text"
                          value={githubAccount}
                          onChange={(e) => setGithubAccount(e.target.value.replace(/\s/g, ""))}
                          placeholder="ton-pseudo"
                          className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint/80 focus:outline-none"
                        />
                      </div>
                      <p className="mt-1.5 text-[11.5px] text-faint">
                        Nous vérifions que ce compte GitHub existe. Son adresse email peut rester privée.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ══════════ ADRESSE EMAIL (COMMUN AUX DEUX MODES) ══════════ */}
              <div>
                <label
                  htmlFor="continup-email"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink"
                >
                  Adresse Email *
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-line/80 bg-surface/60 px-3.5 py-2.5 focus-within:border-candle/50">
                  <Mail size={15} className="shrink-0 text-faint" />
                  <input
                    id="continup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="toi@exemple.com"
                    autoComplete="email"
                    className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint/80 focus:outline-none"
                  />
                </div>
              </div>

              {/* ══════════ MOT DE PASSE (COMMUN AUX DEUX MODES) ══════════ */}
              <div>
                <label
                  htmlFor="continup-password"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink"
                >
                  {mode === "login" ? "Mot de passe *" : "Nouveau mot de passe *"}
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-line/80 bg-surface/60 px-3.5 py-2.5 focus-within:border-candle/50">
                  <Lock size={15} className="shrink-0 text-faint" />
                  <input
                    id="continup-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint/80 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-faint hover:text-ink transition-colors p-1"
                    title={showPassword ? "Masquer" : "Afficher"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Bouton de Soumission */}
              <button
                type="submit"
                disabled={busy || (mode === "login" ? !loginReady : !registerReady)}
                className="btn-primary w-full py-3 mt-2"
              >
                {busy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "Se connecter" : "Créer mon compte"}
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-[12px] leading-relaxed text-faint">
              {mode === "login" ? (
                <>
                  Pas encore de compte ?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="font-semibold text-candle hover:underline"
                  >
                    Inscris-toi en 30 secondes
                  </button>
                </>
              ) : (
                <>
                  Déjà un compte ?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="font-semibold text-candle hover:underline"
                  >
                    Connecte-toi ici
                  </button>
                </>
              )}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
