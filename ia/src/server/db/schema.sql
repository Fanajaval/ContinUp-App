-- ═══════════════════════════════════════════════════════════
--  Le Quatrième Jour — schéma PostgreSQL
--  Aligné sur le modèle de données du CDC §5.
--  A a besoin de : project, task, doc, signal, reve, user, ai_cache.
--  C reste propriétaire du schéma : ce fichier est idempotent,
--  il peut être rejoué sans rien casser.
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Utilisateurs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "user" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pseudo        TEXT NOT NULL,
  email         TEXT UNIQUE,
  style_signal  TEXT NOT NULL DEFAULT 'motivant'
                CHECK (style_signal IN ('sarcastique','motivant','epique','gamer')),
  xp_total      INTEGER NOT NULL DEFAULT 0,
  rang          INTEGER,
  cree_le       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Rêves (M1.3) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reve (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES "user"(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  categorie      TEXT NOT NULL DEFAULT 'autre',
  poids_de_reve  INTEGER NOT NULL DEFAULT 45 CHECK (poids_de_reve BETWEEN 1 AND 100),
  template_type  TEXT NOT NULL DEFAULT 'generique'
                 CHECK (template_type IN ('maison','villa','voiture','centre_aide','generique')),
  statut         TEXT NOT NULL DEFAULT 'actif',
  cree_le        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, label)
);

-- ── Projets ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES "user"(id) ON DELETE CASCADE,
  reve_id           UUID REFERENCES reve(id) ON DELETE SET NULL,
  repo_url          TEXT,
  template_type     TEXT NOT NULL DEFAULT 'maison',
  statut            TEXT NOT NULL DEFAULT 'actif'
                    CHECK (statut IN ('actif','silencieux','acheve')),
  progression       INTEGER NOT NULL DEFAULT 0 CHECK (progression BETWEEN 0 AND 100),
  etape_semantique  TEXT,
  derniere_activite TIMESTAMPTZ DEFAULT NOW(),
  cree_le           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tâches (todolist pondérée produite par A) ─────────────
CREATE TABLE IF NOT EXISTS task (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID REFERENCES project(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  done           BOOLEAN NOT NULL DEFAULT FALSE,
  poids          INTEGER NOT NULL DEFAULT 2 CHECK (poids BETWEEN 1 AND 5),
  etape_template TEXT NOT NULL DEFAULT 'fondations'
                 CHECK (etape_template IN
                   ('terrain','fondations','murs','toit','fenetres','porte','jardin','emmenagement')),
  duree_estimee  INTEGER NOT NULL DEFAULT 20,
  cree_le        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Documents générés (Previously, todolist, résumé, lettre) ──
CREATE TABLE IF NOT EXISTS doc (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID REFERENCES project(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('previously','todolist','resume','lettre','signal')),
  contenu_json JSONB NOT NULL,
  source       TEXT NOT NULL DEFAULT 'genere' CHECK (source IN ('repo','genere','mixte')),
  valide       BOOLEAN NOT NULL DEFAULT FALSE,
  cree_le      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Événements (XP d'exploits, M6.2) ──────────────────────
CREATE TABLE IF NOT EXISTS event (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES project(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('brique','retour','blocage_franchi','finition')),
  date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  xp         INTEGER NOT NULL DEFAULT 1
);

-- ── Signaux envoyés (M4) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS signal (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES project(id) ON DELETE CASCADE,
  declencheur TEXT NOT NULL CHECK (declencheur IN ('S1','S3','S5','S6')),
  style       TEXT NOT NULL,
  contenu     JSONB NOT NULL,
  canal       TEXT NOT NULL DEFAULT 'in_app' CHECK (canal IN ('in_app','email')),
  envoye_le   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lu          BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── Cache des sorties IA (NF1) ────────────────────────────
CREATE TABLE IF NOT EXISTS ai_cache (
  cle      TEXT PRIMARY KEY,
  kind     TEXT NOT NULL,
  scope    TEXT NOT NULL,
  contenu  JSONB NOT NULL,
  cree_le  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Index utiles ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_task_project        ON task(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_project_type    ON doc(project_id, type);
CREATE INDEX IF NOT EXISTS idx_signal_project      ON signal(project_id, envoye_le DESC);
CREATE INDEX IF NOT EXISTS idx_event_project       ON event(project_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_cache_scope         ON ai_cache(scope);
CREATE INDEX IF NOT EXISTS idx_project_activite    ON project(derniere_activite);

-- ── Anti-harcèlement S3 (M4.6) : vue de contrôle pour le cron de C ──
CREATE OR REPLACE VIEW v_signal_du_jour AS
SELECT project_id, declencheur, COUNT(*) AS nb
  FROM signal
 WHERE envoye_le > NOW() - INTERVAL '24 hours'
 GROUP BY project_id, declencheur;
