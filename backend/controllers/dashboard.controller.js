const User = require("../models/User");
const Reve = require("../models/Reve");
const Project = require("../models/Project");
const sequelize = require("../config/database");

const TEMPLATE_TYPES = new Set(["maison", "villa", "voiture", "centre_aide", "generique"]);
const ETAPES = ["terrain", "fondations", "murs", "toit", "fenetres", "porte", "jardin", "emmenagement"];
const IA_URL = process.env.IA_SERVICE_URL || "http://localhost:4000";
const XP = { brique: 1, retour: 5, blocage_franchi: 3, finition: 5 };
const XP_LABEL = {
  brique: "Brique posée",
  retour: "Retour après silence",
  blocage_franchi: "Blocage franchi",
  finition: "Projet achevé",
};

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

function formatSignalRow(row) {
  const contenu = typeof row.contenu === "string" ? JSON.parse(row.contenu) : row.contenu;
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    project_nom: row.repo_nom || "projet",
    declencheur: row.declencheur,
    style: row.style || "motivant",
    contenu: {
      titre: contenu.titre || "",
      preuve_de_progres: contenu.preuve_de_progres || "",
      micro_action: contenu.micro_action || "",
      lien: contenu.lien || `/projet/${row.project_id}`,
    },
    canal: row.canal === "email" ? "email" : "in_app",
    envoye_le: new Date(row.envoye_le).toISOString(),
    lu: Boolean(row.lu),
  };
}

function formatEventRow(row) {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    type: row.type,
    date: new Date(row.created_at).toISOString(),
    xp: Number(row.xp_earned),
    label: row.label || XP_LABEL[row.type] || row.type,
  };
}

function currentEtape(project) {
  const done = Array.isArray(project.etapes_done) ? project.etapes_done : [];
  return done.length ? done[done.length - 1] : "terrain";
}

function silenceDays(project) {
  return Math.max(0, Math.floor((Date.now() - new Date(project.derniere_activite).getTime()) / 86_400_000));
}

function buildFallbackSignal(project, reveLabel, declencheur) {
  const preuve = `${Number(project.progression)} % — ${project.etape_semantique}.`;
  const micro = project.prochaine_action || "Reprendre la prochaine petite action (20 min)";
  const lien = `/projet/${project.id}`;
  switch (declencheur) {
    case "S1":
      return { titre: `${project.etape_semantique} 🧱`, preuve_de_progres: `${project.repo_nom} avance.`, micro_action: micro, cta_url: lien };
    case "S3":
      return { titre: `${reveLabel || project.repo_nom} t'attend`, preuve_de_progres: preuve, micro_action: micro, cta_url: lien };
    case "S5":
      return { titre: "Te revoilà. On reprend exactement où tu t'es arrêtée.", preuve_de_progres: `Ton chantier t'a attendue. ${preuve}`, micro_action: micro, cta_url: lien };
    default:
      return { titre: "Une prochaine étape t'attend", preuve_de_progres: preuve, micro_action: micro, cta_url: lien };
  }
}

async function callIaSignal({ projectId, declencheur, style, contexte }) {
  try {
    const res = await fetch(`${IA_URL.replace(/\/$/, "")}/api/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: String(projectId), declencheur, style, canal: "in_app", contexte, force: false }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function persistSignal(userId, project, declencheur, style, payload) {
  const contenu = {
    titre: payload.titre,
    preuve_de_progres: payload.preuve_de_progres,
    micro_action: payload.micro_action,
    lien: payload.cta_url || `/projet/${project.id}`,
  };
  const [rows] = await sequelize.query(
    `INSERT INTO signals (project_id, user_id, declencheur, style, contenu, canal, lu)
     VALUES ($1, $2, $3, $4, $5, 'in_app', false) RETURNING *`,
    { bind: [project.id, userId, declencheur, style, JSON.stringify(contenu)] },
  );
  rows[0].repo_nom = project.repo_nom;
  return formatSignalRow(rows[0]);
}

async function recordEvent(projectId, userId, type, label) {
  const xp = XP[type] || 0;
  await sequelize.query(
    `INSERT INTO events (project_id, type, xp_earned, label) VALUES ($1, $2, $3, $4)`,
    { bind: [projectId, type, xp, label || XP_LABEL[type] || type] },
  );
  if (xp > 0) {
    await sequelize.query(`UPDATE users SET xp_total = xp_total + $1 WHERE id = $2`, { bind: [xp, userId] });
    await sequelize.query(`UPDATE projects SET xp_projet = xp_projet + $1 WHERE id = $2`, { bind: [xp, projectId] });
  }
  return xp;
}

async function refreshProjectStatuses(userId) {
  await sequelize.query(
    `UPDATE projects SET statut = 'silencieux'
     WHERE user_id = $1 AND statut IN ('actif', 'vide')
     AND derniere_activite < NOW() - INTERVAL '72 hours'`,
    { bind: [userId] },
  );
}

async function loadSignauxActifs(userId) {
  const [rows] = await sequelize.query(
    `SELECT s.*, p.repo_nom FROM signals s
     JOIN projects p ON p.id = s.project_id
     WHERE s.user_id = $1 ORDER BY s.envoye_le DESC LIMIT 20`,
    { bind: [userId] },
  );
  return rows.map(formatSignalRow);
}

async function loadEventsRecents(userId) {
  const [rows] = await sequelize.query(
    `SELECT e.* FROM events e JOIN projects p ON p.id = e.project_id
     WHERE p.user_id = $1 ORDER BY e.created_at DESC LIMIT 15`,
    { bind: [userId] },
  );
  return rows.map(formatEventRow);
}

async function emitSignal({ user, project, reve, declencheur, useIa = true }) {
  const style = user.style_signal || "motivant";
  const contexte = {
    pseudo: user.name,
    reveLabel: reve?.label,
    templateType: project.template_type,
    projectName: project.repo_nom,
    progression: Number(project.progression),
    etape_courante: currentEtape(project),
    preuve_de_progres: `${Number(project.progression)} % — ${project.etape_semantique}.`,
    micro_action: project.prochaine_action,
    micro_action_duree_min: 20,
    jours_de_silence: silenceDays(project),
  };
  let payload = (declencheur === "S1" || !useIa)
    ? buildFallbackSignal(project, reve?.label, declencheur)
    : await callIaSignal({ projectId: project.id, declencheur, style, contexte });
  if (!payload) payload = buildFallbackSignal(project, reve?.label, declencheur);
  return persistSignal(user.id, project, declencheur, style, payload);
}

async function countRecentS3(projectId) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*)::int AS count FROM signals
     WHERE project_id = $1 AND declencheur = 'S3' AND envoye_le > NOW() - INTERVAL '7 days'`,
    { bind: [projectId] },
  );
  return rows[0]?.count ?? 0;
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
    await refreshProjectStatuses(user.id);
    const [reves, projects, signaux_actifs, events_recents] = await Promise.all([
      Reve.findAll({ where: { user_id: user.id }, order: [["id", "ASC"]] }),
      Project.findAll({ where: { user_id: user.id }, order: [["derniere_activite", "DESC"]] }),
      loadSignauxActifs(user.id),
      loadEventsRecents(user.id),
    ]);
    const xpFromProjects = projects.reduce((t, p) => t + p.xp_projet, 0);
    return res.json({
      user: {
        id: String(user.id), pseudo: user.name, email: user.email,
        style_signal: user.style_signal || "motivant",
        xp_total: Math.max(Number(user.xp_total) || 0, xpFromProjects), rang: null,
      },
      reves: reves.map((r) => ({
        id: String(r.id), user_id: String(r.user_id), label: r.label,
        categorie: r.categorie, poids_de_reve: Number(r.poids_de_reve), statut: r.statut,
      })),
      projects: projects.map(asProject),
      signaux_actifs,
      events_recents,
    });
  } catch (error) {
    console.error("Erreur dashboard:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getClassement = async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT u.id, u.name AS pseudo,
         GREATEST(u.xp_total, COALESCE(SUM(p.xp_projet), 0))::int AS xp_total,
         COUNT(e.id) FILTER (WHERE e.type = 'retour')::int AS retours,
         COUNT(e.id) FILTER (WHERE e.type = 'finition')::int AS finitions
       FROM users u
       LEFT JOIN projects p ON p.user_id = u.id
       LEFT JOIN events e ON e.project_id = p.id
       GROUP BY u.id, u.name, u.xp_total
       HAVING GREATEST(u.xp_total, COALESCE(SUM(p.xp_projet), 0)) > 0
          OR COUNT(e.id) FILTER (WHERE e.type = 'retour') > 0
       ORDER BY retours DESC, xp_total DESC LIMIT 50`,
    );
    return res.json(rows.map((row, i) => ({
      rang: i + 1, pseudo: row.pseudo, xp_total: Number(row.xp_total),
      retours: Number(row.retours), finitions: Number(row.finitions),
      is_me: String(row.id) === String(req.user.id),
    })));
  } catch (error) {
    console.error("Erreur classement:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.createProject = async (req, res) => {
  try {
    const repoUrl = String(req.body.repo_url || "").trim();
    const dreams = Array.isArray(req.body.dreams) ? req.body.dreams.map((d) => String(d).trim()).filter(Boolean) : [];
    const selectedDream = String(req.body.selected_dream || "").trim();
    const templateType = String(req.body.template_type || "generique");
    if (!repoUrl || !selectedDream || !dreams.includes(selectedDream)) {
      return res.status(400).json({ message: "Repo et rêve principal requis" });
    }
    if (!TEMPLATE_TYPES.has(templateType)) return res.status(400).json({ message: "Type de chantier invalide" });
    const createdDreams = await Promise.all(dreams.map((label) =>
      Reve.findOrCreate({ where: { user_id: req.user.id, label }, defaults: { user_id: req.user.id, label } })
        .then(([dream]) => dream)));
    const primaryDream = createdDreams.find((d) => d.label === selectedDream);
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
    console.error("Erreur lecture analyse:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

async function runAnalyze(req, res, { awardBrique = false } = {}) {
  const project = await findUserProject(req, res);
  if (!project) return null;
  const user = await User.findByPk(req.user.id);
  const reve = await Reve.findOne({ where: { id: project.reve_id, user_id: req.user.id } });
  const oldProgression = Number(project.progression);

  const response = await fetch(`${IA_URL.replace(/\/$/, "")}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: String(project.id), repoUrl: project.repo_url,
      templateType: project.template_type, reveLabel: reve?.label,
      force: Boolean(req.body?.force),
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    res.status(502).json({ message: payload?.error || "Le service IA n'a pas pu analyser ce dépôt." });
    return null;
  }

  const tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
  const newProgression = Number.isFinite(Number(payload.progression)) ? Number(payload.progression) : oldProgression;
  await project.update({
    objectif: payload.resume_projet || null, ai_tasks: tasks, ai_analyzed_at: new Date(),
    ai_degraded: Boolean(payload.degraded), progression: newProgression,
    etape_semantique: payload.etape_libelle || project.etape_semantique,
    etapes_done: completedStages(tasks),
    prochaine_action: payload.previously?.prochaine_action || project.prochaine_action,
    statut: newProgression >= 100 ? "acheve" : "actif", derniere_activite: new Date(),
  });
  await project.reload();

  let signal = null;
  if (awardBrique) {
    await recordEvent(project.id, user.id, "brique", `Sync — ${project.repo_nom}`);
    signal = await emitSignal({ user, project, reve, declencheur: "S1", useIa: false });
    await project.reload();
  }
  if (newProgression >= 100 && oldProgression < 100) {
    await recordEvent(project.id, user.id, "finition", `Projet achevé — ${project.repo_nom}`);
    await project.reload();
  }
  return { project: asProject(project), ...asAnalysis(project), source: payload.source, signal };
}

exports.analyzeProject = async (req, res) => {
  try {
    const result = await runAnalyze(req, res, { awardBrique: false });
    if (!result) return;
    return res.json(result);
  } catch (error) {
    console.error("Erreur analyse IA:", error);
    return res.status(503).json({ message: "Service IA indisponible (port 4000)." });
  }
};

exports.syncProject = async (req, res) => {
  try {
    req.body = { ...(req.body || {}), force: true };
    const result = await runAnalyze(req, res, { awardBrique: true });
    if (!result) return;
    return res.json(result);
  } catch (error) {
    console.error("Erreur sync:", error);
    return res.status(503).json({ message: "Synchronisation indisponible" });
  }
};

exports.celebrateReturn = async (req, res) => {
  try {
    const project = await findUserProject(req, res);
    if (!project) return;
    if (project.statut !== "silencieux") {
      return res.json({ project: asProject(project), signal: null, xp_awarded: 0 });
    }
    const user = await User.findByPk(req.user.id);
    const reve = await Reve.findOne({ where: { id: project.reve_id, user_id: req.user.id } });
    const xpAwarded = await recordEvent(project.id, user.id, "retour", `Retour — ${project.repo_nom}`);
    const signal = await emitSignal({ user, project, reve, declencheur: "S5", useIa: true });
    await project.update({ statut: "actif", derniere_activite: new Date() });
    await project.reload();
    return res.json({ project: asProject(project), signal, xp_awarded: xpAwarded });
  } catch (error) {
    console.error("Erreur célébration retour:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.simulateDay4 = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    await refreshProjectStatuses(user.id);
    const projectId = req.body?.project_id ? String(req.body.project_id) : null;
    let projects;
    if (projectId) {
      const one = await Project.findOne({ where: { id: projectId, user_id: user.id } });
      projects = one ? [one] : [];
    } else {
      projects = await Project.findAll({ where: { user_id: user.id, statut: "silencieux" }, order: [["derniere_activite", "ASC"]] });
    }
    const signals = [];
    for (const project of projects) {
      if ((await countRecentS3(project.id)) >= 2) continue;
      const reve = await Reve.findOne({ where: { id: project.reve_id } });
      signals.push(await emitSignal({ user, project, reve, declencheur: "S3", useIa: true }));
    }
    return res.json({ triggered: signals.length, signals });
  } catch (error) {
    console.error("Erreur simulate-day4:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};
