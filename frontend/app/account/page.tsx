import TopBar from "@/components/layout/TopBar";
import { getDashboard } from "@/lib/api";
import { Sparkles, ShieldCheck, LayoutGrid, Github } from "lucide-react";

export default async function AccountPage() {
  const data = await getDashboard();
  const { user, projects, signaux_actifs } = data;
  const unreadSignals = signaux_actifs.filter((signal) => !signal.lu).length;
  const activeProjects = projects.filter((project) => project.statut === "actif").length;
  const silentProjects = projects.filter((project) => project.statut === "silencieux").length;
  const completedProjects = projects.filter((project) => project.statut === "acheve").length;

  return (
    <div className="min-h-screen">
      <TopBar pseudo={user.pseudo} xp={user.xp_total} nonLus={unreadSignals} />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-muted">Compte</p>
            <h1 className="mt-2 text-3xl font-display font-bold tracking-tight text-ink">Mon profil GitHub</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted">
              Le compte connecté qui alimente tes chantiers, tes signaux et ton classement.
            </p>
          </div>
          <div className="rounded-3xl border border-line/70 bg-surface px-4 py-3 text-sm text-muted shadow-sm">
            Connecté en tant que <span className="font-semibold text-ink">{user.pseudo}</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-6 rounded-3xl border border-line/70 bg-surface p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink">Informations du compte</p>
                <p className="mt-1 text-sm text-muted">
                  Détails du profil utilisateur et de la connexion GitHub.
                </p>
              </div>
              <div className="rounded-2xl bg-night/80 px-3 py-2 text-sm font-semibold text-white shadow-sm">
                GitHub
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-line/70 bg-night/80 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">Pseudo GitHub</p>
                <div className="mt-3 flex items-center gap-3 text-lg font-semibold text-white">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <Github size={18} />
                  </span>
                  {user.pseudo}
                </div>
              </div>
              <div className="rounded-3xl border border-line/70 bg-night/80 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">Email</p>
                <p className="mt-3 text-lg font-semibold text-white">{user.email}</p>
              </div>
              <div className="rounded-3xl border border-line/70 bg-night/80 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">XP total</p>
                <p className="mt-3 text-lg font-semibold text-white">{user.xp_total} XP</p>
              </div>
              <div className="rounded-3xl border border-line/70 bg-night/80 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">Rang</p>
                <p className="mt-3 text-lg font-semibold text-white">{user.rang ?? "—"}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-line/70 bg-night/80 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">Projets actifs</p>
                <p className="mt-3 text-lg font-semibold text-white">{activeProjects}</p>
              </div>
              <div className="rounded-3xl border border-line/70 bg-night/80 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">Projets silencieux</p>
                <p className="mt-3 text-lg font-semibold text-white">{silentProjects}</p>
              </div>
              <div className="rounded-3xl border border-line/70 bg-night/80 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">Projets achevés</p>
                <p className="mt-3 text-lg font-semibold text-white">{completedProjects}</p>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-line/70 bg-surface p-6">
              <p className="text-sm font-semibold text-ink">Statut de connexion</p>
              <div className="mt-4 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-candle to-ember px-4 py-4 text-sm font-semibold text-night">
                <Sparkles size={18} />
                Connecté à GitHub
              </div>
              <p className="mt-3 text-sm text-muted">
                Ton compte est utilisé pour suivre tes progrès, ton classement et tes signaux.
              </p>
            </div>

            <div className="rounded-3xl border border-line/70 bg-surface p-6">
              <p className="text-sm font-semibold text-ink">Style de signaux</p>
              <div className="mt-4 flex items-center gap-3 rounded-3xl bg-night/80 px-4 py-4 text-sm text-white">
                <ShieldCheck size={18} />
                {user.style_signal}
              </div>
              <p className="mt-3 text-sm text-muted">
                Ce style influe sur la tonalité des messages de motivation que tu reçois.
              </p>
            </div>
          </aside>
        </div>

        <div className="mt-6 rounded-3xl border border-line/70 bg-surface p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Repos GitHub associés</p>
              <p className="mt-1 text-sm text-muted">
                Projets liés à ton compte qui ont un repo GitHub connecté.
              </p>
            </div>
            <div className="rounded-full bg-grow/10 px-3 py-1 text-sm font-semibold text-grow">
              {projects.length} repos
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {projects.map((project) => (
              <a
                key={project.id}
                href={project.repo_url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between gap-3 rounded-3xl border border-line/70 bg-night/80 px-4 py-4 transition hover:border-white/20 hover:bg-night/75"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white transition group-hover:bg-white/20">
                    <LayoutGrid size={18} />
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <p className="truncate text-sm font-semibold text-white">{project.repo_nom}</p>
                    <p className="truncate text-sm text-muted">{project.repo_url}</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted">
                  {project.statut}
                </span>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
