-- =============================================
-- DATABASE INITIALIZATION
-- Projet : Ton repo construit ta vie rêvée
-- =============================================

-- USER
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pseudo VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- pour auth email/password
    github_id VARCHAR(255) UNIQUE, -- pour OAuth GitHub
    style_signal VARCHAR(20) DEFAULT 'motivant', -- sarcastique | motivant | epique | gamer
    xp_total INTEGER DEFAULT 0,
    rang INTEGER, -- calculé périodiquement ou via trigger
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- REVE (portefeuille de rêves)
CREATE TABLE IF NOT EXISTS reves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    categorie VARCHAR(50), -- maison, villa, voiture, centre_aide, generique, autre
    poids_de_reve DECIMAL(5,2) NOT NULL DEFAULT 1.0, -- IA peut ajuster
    statut VARCHAR(20) DEFAULT 'actif' -- actif | acheve | abandonne
);

-- PROJECT
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reve_id UUID REFERENCES reves(id) ON DELETE SET NULL,
    repo_url VARCHAR(512) NOT NULL,
    repo_name VARCHAR(255), -- extrait de l'URL
    template_type VARCHAR(50) DEFAULT 'maison', -- maison, villa, voiture, centre_aide, generique
    statut VARCHAR(20) DEFAULT 'actif', -- actif | silencieux | acheve
    progression DECIMAL(5,2) DEFAULT 0, -- 0 à 100
    etape_semantique VARCHAR(100), -- "Fondations coulées"
    derniere_activite TIMESTAMP DEFAULT NOW(),
    total_commits INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- TASK (todolist générée par IA)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    poids DECIMAL(5,2) DEFAULT 1.0,
    etape_template VARCHAR(50), -- correspondance avec template : "fondations", "murs", etc.
    duree_estimee INTEGER, -- en minutes (20, 60, 120)
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- DOC (documents du repo : générés ou trouvés)
CREATE TABLE IF NOT EXISTS docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- resume | cdc | todolist | readme
    contenu_json JSONB NOT NULL, -- flexible pour stocker le contenu structuré
    source VARCHAR(20) DEFAULT 'genere', -- genere | trouve
    valide BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- EVENT (activité)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL, -- brique | retour | blocage_franchi | finition
    xp_earned INTEGER DEFAULT 0,
    meta JSONB, -- données additionnelles (commit_hash, nb_files, etc.)
    created_at TIMESTAMP DEFAULT NOW()
);

-- SIGNAL (le système nerveux)
CREATE TABLE IF NOT EXISTS signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    declencheur VARCHAR(20) NOT NULL, -- S1 | S3 | S5 | S6
    style VARCHAR(20) DEFAULT 'motivant',
    contenu TEXT NOT NULL,
    canal VARCHAR(20) DEFAULT 'in-app', -- in-app | email
    envoye_le TIMESTAMP DEFAULT NOW(),
    lu BOOLEAN DEFAULT FALSE,
    relance_count INTEGER DEFAULT 0 -- pour max 2
);

-- INDEXES pour performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_reve_id ON projects(reve_id);
CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id);
CREATE INDEX IF NOT EXISTS idx_signals_project_id ON signals(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);

-- =============================================
-- FONCTION : updated_at automatique
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON projects;
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
