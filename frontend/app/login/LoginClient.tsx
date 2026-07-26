"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Github, Loader2, Mail, UserRound } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { useUiToast } from "@/components/ui/ToastProvider";
import { getToken, setSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

type FieldErrors = {
  name?: string;
  email?: string;
  github?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidGithubUsername(value: string) {
  const u = value.trim().replace(/^@/, "");
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(u);
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast, dismiss } = useUiToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [showGithubForm, setShowGithubForm] = useState(false);
  const [touched, setTouched] = useState<{
    name?: boolean;
    email?: boolean;
    github?: boolean;
  }>({});
  const [busy, setBusy] = useState<null | "github" | "email">(null);
  const [needName, setNeedName] = useState(false);

  const errors: FieldErrors = useMemo(() => {
    const next: FieldErrors = {};
    if (touched.name || needName) {
      if (name.trim().length > 0 && name.trim().length < 2) {
        next.name = "Au moins 2 caractères";
      }
      if (needName && name.trim().length < 2) {
        next.name = "Ton nom est requis pour créer le compte";
      }
    }
    if (touched.email) {
      if (!email.trim()) next.email = "L'adresse email est requise";
      else if (!isValidEmail(email)) next.email = "Adresse email invalide";
    }
    if (touched.github) {
      if (!githubUsername.trim()) {
        next.github = "Indique ton nom d'utilisateur GitHub";
      } else if (!isValidGithubUsername(githubUsername)) {
        next.github = "Nom d'utilisateur GitHub invalide";
      }
    }
    return next;
  }, [name, email, githubUsername, touched, needName]);

  const emailReady =
    isValidEmail(email) && (!needName || name.trim().length >= 2);
  const githubReady = isValidGithubUsername(githubUsername);

  useEffect(() => {
    if (searchParams.get("oauth") === "error") {
      toast({
        kind: "info",
        message: "Connexion GitHub interrompue",
        detail: "Réessaie avec ton nom d'utilisateur GitHub.",
      });
      router.replace("/login");
      return;
    }
    if (getToken()) {
      router.replace("/dashboard");
    }
  }, [searchParams, router, toast]);

  async function onGithubSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched((t) => ({ ...t, github: true }));
    if (!isValidGithubUsername(githubUsername)) {
      toast({ kind: "info", message: "Nom d'utilisateur GitHub invalide" });
      return;
    }

    setBusy("github");
    const loadingId = toast({
      kind: "loading",
      message: `Récupération de @${githubUsername.trim().replace(/^@/, "")}…`,
    });

    try {
      const res = await fetch("/api/auth/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: githubUsername.trim().replace(/^@/, ""),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Compte GitHub introuvable");
      }

      setSession(data.token, {
        id: String(data.user.id),
        name: data.user.name,
        photo: data.github?.avatar_url ?? null,
      });
      dismiss(loadingId);
      toast({
        kind: "success",
        message: `Connecté en tant que @${data.github?.login || data.user.name}`,
      });
      router.push("/onboarding");
    } catch (err) {
      dismiss(loadingId);
      toast({
        kind: "info",
        message: err instanceof Error ? err.message : "Échec GitHub",
        duration: 5000,
      });
      setBusy(null);
    }
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true });

    if (!isValidEmail(email)) {
      toast({ kind: "info", message: "Adresse email invalide" });
      return;
    }

    setBusy("email");
    const loadingId = toast({ kind: "loading", message: "Connexion en cours…" });

    try {
      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (res.status === 400 && data.needName) {
        setNeedName(true);
        setTouched((t) => ({ ...t, name: true }));
        dismiss(loadingId);
        toast({
          kind: "info",
          message: "Premier passage ?",
          detail: "Indique ton nom pour ouvrir ton espace ContinUp.",
        });
        setBusy(null);
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || "Échec de connexion");
      }

      setSession(data.token, {
        id: String(data.user.id),
        name: data.user.name,
        email: email.trim().toLowerCase(),
      });
      dismiss(loadingId);
      toast({ kind: "success", message: `Bienvenue, ${data.user.name}` });
      router.push("/onboarding");
    } catch (err) {
      dismiss(loadingId);
      toast({
        kind: "info",
        message: err instanceof Error ? err.message : "Échec de connexion",
        duration: 4500,
      });
      setBusy(null);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
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
              <p
                key={line}
                className="text-[13.5px] leading-relaxed text-ink/80"
              >
                {line}
              </p>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="order-1 lg:order-2"
        >
          <div className="panel p-6 shadow-lift sm:p-7">
            <h2 className="font-display text-[22px] font-bold text-ink">
              Continuer ton histoire
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-snug text-muted">
              Le plus dur, c&apos;est de rouvrir le dossier. On s&apos;occupe du
              reste.
            </p>

            {!showGithubForm ? (
              <button
                type="button"
                onClick={() => setShowGithubForm(true)}
                disabled={!!busy}
                className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl
                           bg-ink px-4 py-3.5 text-[14px] font-semibold text-night
                           transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Github size={16} />
                Continuer avec GitHub
              </button>
            ) : (
              <AnimatePresence>
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  onSubmit={onGithubSubmit}
                  className="mt-6 space-y-3"
                  noValidate
                >
                  <label
                    htmlFor="continup-github"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink"
                  >
                    Nom d&apos;utilisateur GitHub
                  </label>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-xl border bg-surface/60 px-3.5 py-3 transition-colors",
                      errors.github ? "border-ember/50" : "border-line/80"
                    )}
                  >
                    <Github size={15} className="shrink-0 text-faint" />
                    <span className="text-[14px] text-faint">@</span>
                    <input
                      id="continup-github"
                      value={githubUsername}
                      onChange={(e) =>
                        setGithubUsername(e.target.value.replace(/\s/g, ""))
                      }
                      onBlur={() =>
                        setTouched((t) => ({ ...t, github: true }))
                      }
                      placeholder="ton-username"
                      autoFocus
                      autoComplete="username"
                      className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint/80 focus:outline-none focus:ring-0"
                    />
                  </div>
                  {errors.github && (
                    <p className="text-[12px] text-ember">{errors.github}</p>
                  )}
                  <p className="text-[11.5px] text-faint">
                    On récupère ton profil public GitHub pour te connecter —
                    le tien, pas un compte générique.
                  </p>
                  <button
                    type="submit"
                    disabled={busy === "github" || !githubReady}
                    className="btn-primary w-full py-3"
                  >
                    {busy === "github" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        Se connecter avec ce compte
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGithubForm(false);
                      setGithubUsername("");
                      setTouched((t) => ({ ...t, github: false }));
                    }}
                    className="w-full text-center text-[12px] text-faint hover:text-muted"
                  >
                    Annuler
                  </button>
                </motion.form>
              </AnimatePresence>
            )}

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="text-[11px] uppercase tracking-wider text-faint">
                ou par email
              </span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={onEmail} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="continup-name"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink"
                >
                  Nom
                </label>
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl border bg-surface/60 px-3.5 py-3 transition-colors",
                    errors.name ? "border-ember/50" : "border-line/80"
                  )}
                >
                  <UserRound size={15} className="shrink-0 text-faint" />
                  <input
                    id="continup-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    placeholder="Ton prénom ou pseudo"
                    autoComplete="name"
                    className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint/80 focus:outline-none focus:ring-0"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1.5 text-[12px] text-ember">{errors.name}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="continup-email"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink"
                >
                  Adresse email
                </label>
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl border bg-surface/60 px-3.5 py-3 transition-colors",
                    errors.email ? "border-ember/50" : "border-line/80"
                  )}
                >
                  <Mail size={15} className="shrink-0 text-faint" />
                  <input
                    id="continup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    placeholder="toi@exemple.com"
                    autoComplete="email"
                    className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint/80 focus:outline-none focus:ring-0"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-[12px] text-ember">{errors.email}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={busy === "email" || !emailReady}
                className="btn-primary w-full py-3"
              >
                {busy === "email" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    Continuer avec mon email
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-[11.5px] leading-relaxed text-faint">
              Aucun mot de passe à retenir. Ton projet t&apos;attend — même
              s&apos;il dort depuis des semaines.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
