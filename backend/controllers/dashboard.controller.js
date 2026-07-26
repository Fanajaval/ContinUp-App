const User = require("../models/User");
const Reve = require("../models/Reve");
const Project = require("../models/Project");

const TEMPLATE_TYPES = new Set(["maison", "villa", "voiture", "centre_aide", "generique"]);
const ETAPES = ["terrain", "fondations", "murs", "toit", "fenetres", "porte", "jardin", "emmenagement"];

function asProject(project) {
  return {
    id: String(project.id),
    user_id: String(project.user_id),
    reve_id: String(project.reve_id),
    repo_url: project.repo_url,
    repo_nom: project.repo_nom,
    template_type: project.template_type,
    statut: project.statut,
    progression: Number(project.progression),
    etape_semantique: project.etape_semantique,
    etapes_done: Array.isArray(project.etapes_done) ? project.etapes_done : [],
    derniere_activite: project.derniere_activite.toISOString(),
    xp_projet: project.xp_projet,
    prochaine_action: project.prochaine_action,
  };
}

function asAnalysis(project) {
  const tasks = Array.isArray(project.ai_tasks) ? project.ai_tasks : [];
  if (!project.ai_analyzed_at && !tasks.length) return { analysis: null };
  return {
    analysis: {
      objectif: project.objectif,
      tasks,
      analyzed_at: project.ai_analyzed_at ? project.ai_analyzed_at.toISOString() : null,
      degraded: Boolean(project.ai_degraded),
    },
  };
}

async function findUserProject(req, res) {
  const project = await Project.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!project) {
    res.status(404).json({ message: "Chantier introuvable" });
    return null;
  }
  return project;
}

function completedStages(tasks) {
  return ETAPES.filter((etape) => {
    const stageTasks = tasks.filter((task) => task.etape_template === etape);
    return stageTasks.length > 0 && stageTasks.every((task) => task.done);
  });
}

exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    const [reves, projects] = await Promise.all([
      Reve.findAll({ where: { user_id: user.id }, order: [["id", "ASC"]] }),
      Project.findAll({ where: { user_id: user.id }, order: [["derniere_activite", "DESC"]] }),
    ]);

    return res.json({
      user: {
        id: String(user.id),
        pseudo: user.name,
        email: user.email,
        style_signal: "motivant",
        xp_total: projects.reduce((total, project) => total + project.xp_projet, 0),
        rang: null,
      },
      reves: reves.map((reve) => ({
        id: String(reve.id), user_id: String(reve.user_id), label: reve.label,
        categorie: reve.categorie, poids_de_reve: Number(reve.poids_de_reve), statut: reve.statut,
      })),
      projects: projects.map(asProject),
      signaux_actifs: [],
      events_recents: [],
    });
  } catch (error) {
    console.error("Erreur dashboard:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.createProject = async (req, res) => {
  try {
    const repoUrl = String(req.body.repo_url || "").trim();
    const dreams = Array.isArray(req.body.dreams) ? req.body.dreams.map((dream) => String(dream).trim()).filter(Boolean) : [];
    const selectedDream = String(req.body.selected_dream || "").trim();
    const templateType = String(req.body.template_type || "generique");
    if (!repoUrl || !selectedDream || !dreams.includes(selectedDream)) {
      return res.status(400).json({ message: "Repo et rêve principal requis" });
    }
    if (!TEMPLATE_TYPES.has(templateType)) {
      return res.status(400).json({ message: "Type de chantier invalide" });
    }

    const createdDreams = await Promise.all(dreams.map((label) => Reve.findOrCreate({
      where: { user_id: req.user.id, label },
      defaults: { user_id: req.user.id, label },
    }).then(([dream]) => dream)));
    const primaryDream = createdDreams.find((dream) => dream.label === selectedDream);
    const repoNom = repoUrl.replace(/\/$/, "").split("/").pop() || "nouveau-projet";

    const project = await Project.create({
      user_id: req.user.id, reve_id: primaryDream.id, repo_url: repoUrl, repo_nom: repoNom,
      template_type: templateType, prochaine_action: "Écrire le README et poser l'arborescence du projet",
    });
    return res.status(201).json({ project: asProject(project) });
  } catch (error) {
    console.error("Erreur création projet:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getProjectAnalysis = async (req, res) => {
  try {
    const project = await findUserProject(req, res);
    if (!project) return;
    return res.json(asAnalysis(project));
  } catch (error) {
    console.error("Erreur lecture analyse IA:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.analyzeProject = async (req, res) => {
  try {
    const project = await findUserProject(req, res);
    if (!project) return;
    const reve = await Reve.findOne({ where: { id: project.reve_id, user_id: req.user.id } });
    const iaBaseUrl = process.env.IA_SERVICE_URL || "http://localhost:4000";
    const response = await fetch(`${iaBaseUrl.replace(/\/$/, "")}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: String(project.id),
        repoUrl: project.repo_url,
        templateType: project.template_type,
        reveLabel: reve?.label,
        force: Boolean(req.body?.force),
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) {
      return res.status(502).json({
        message: payload?.error || "Le service IA n'a pas pu analyser ce dépôt.",
      });
    }

    const tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
    const doneStages = completedStages(tasks);
    await project.update({
      objectif: payload.resume_projet || null,
      ai_tasks: tasks,
      ai_analyzed_at: new Date(),
      ai_degraded: Boolean(payload.degraded),
      progression: Number.isFinite(Number(payload.progression)) ? Number(payload.progression) : project.progression,
      etape_semantique: payload.etape_libelle || project.etape_semantique,
      etapes_done: doneStages,
      prochaine_action: payload.previously?.prochaine_action || project.prochaine_action,
      statut: tasks.some((task) => task.done) ? "actif" : project.statut,
      derniere_activite: new Date(),
    });
    return res.json({ project: asProject(project), ...asAnalysis(project), source: payload.source });
  } catch (error) {
    console.error("Erreur analyse IA:", error);
    return res.status(503).json({
      message: "Le service IA est indisponible. Démarrez-le sur le port 4000 puis réessayez.",
    });
  }
};
