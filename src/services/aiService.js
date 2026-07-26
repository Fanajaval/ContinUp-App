const axios = require('axios');
const env = require('../config/env');

/**
 * AI Service — appels LLM (texte uniquement en V1)
 * Avec retries, timeout, et mode dégradé
 */

const client = axios.create({
  baseURL: env.AI_BASE_URL,
  timeout: env.AI_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    ...(env.AI_API_KEY && { Authorization: `Bearer ${env.AI_API_KEY}` }),
  },
});

/**
 * Appel LLM avec retries
 */
async function callLLM(messages, options = {}) {
  const { maxRetries = env.AI_MAX_RETRIES, temperature = 0.7, maxTokens = 2000 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.post('/chat/completions', {
        model: env.AI_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error(`[AI] Attempt ${attempt}/${maxRetries} failed:`, error.message);
      if (attempt === maxRetries) {
        throw new Error(`AI service unavailable after ${maxRetries} attempts`);
      }
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * M1.3 — Analyse du portefeuille de rêves
 * Retourne catégories et PoidsDeRêve
 */
async function analyzeDreamPortfolio(dreams) {
  const messages = [
    {
      role: 'system',
      content: `Tu es un assistant qui analyse des rêves personnels pour un projet de développement.
Pour chaque rêve, retourne :
- categorie : parmi "maison", "villa", "voiture", "centre_aide", "generique", "autre"
- poids_de_reve : un nombre entre 0.5 et 3.0 représentant la complexité/ambition relative

Réponds UNIQUEMENT en JSON valide, sans markdown. Format :
[{"label": "...", "categorie": "...", "poids_de_reve": X.XX}]`,
    },
    {
      role: 'user',
      content: `Analyse ces rêves : ${JSON.stringify(dreams)}`,
    },
  ];

  const response = await callLLM(messages);
  try {
    return JSON.parse(response);
  } catch {
    // Fallback : retourne les rêves avec des valeurs par défaut
    return dreams.map((d) => ({
      label: typeof d === 'string' ? d : d.label,
      categorie: 'generique',
      poids_de_reve: 1.0,
    }));
  }
}

/**
 * M2.2/M2.3 — Analyse de repo
 * Fast-path si docs trouvés, sinon génère tout
 */
async function analyzeRepo(repoData) {
  const { repoName, files, existingDocs } = repoData;

  const hasExistingDocs = existingDocs && existingDocs.length > 0;

  const messages = [
    {
      role: 'system',
      content: `Tu es un assistant qui analyse un dépôt Git pour comprendre le projet.
${hasExistingDocs ? 'Des documents existent déjà dans le repo — utilise-les pour accélérer.' : 'Aucun document trouvé — génère tout à partir du code.'}

Analyse l'arborescence et les contenus, puis retourne en JSON :
{
  "resume": "Résumé du projet en 2-3 phrases",
  "previously": {
    "ou_tu_en_es": "Où tu en es globalement",
    "derniere_action": "Dernière action effectuée",
    "prochaine_action": "Prochaine micro-action concrète (~20 min)"
  },
  "todolist": [
    {"label": "...", "poids": X.X, "etape_template": "...", "duree_estimee": 20|60|120, "done": false}
  ],
  "progression": 0-100,
  "etape_semantique": "Nom de l'étape actuelle (ex: Fondations coulées)",
  "template_type": "maison|villa|voiture|centre_aide|generique"
}

Étapes template maison (8 étapes): terrain, fondations, murs, toit, fenetres, porte, jardin, emménagement
Étapes template villa: terrain, fondations, murs, toit, piscine, facade, jardin_artisanal, emménagement
Étapes template voiture: chassis, moteur, carrosserie, interieur, roues, electronique, finitions, route
Étapes template centre_aide: terrain, fondations, murs, toiture, amenagement_interieur, equipements, personnel, inauguration

Réponds UNIQUEMENT en JSON valide.`,
    },
    {
      role: 'user',
      content: `Repo: ${repoName}
${hasExistingDocs ? `Documents trouvés: ${JSON.stringify(existingDocs)}` : ''}
Arborescence:
${JSON.stringify(files, null, 2)}`,
    },
  ];

  const response = await callLLM(messages, { maxTokens: 4000, temperature: 0.5 });
  try {
    return JSON.parse(response);
  } catch {
    // Fallback minimum
    return {
      resume: `Projet ${repoName}`,
      previously: { ou_tu_en_es: 'Début du projet', derniere_action: 'Initialisation', prochaine_action: 'Configurer le projet' },
      todolist: [{ label: 'Configurer le projet', poids: 1.0, etape_template: 'terrain', duree_estimee: 20, done: false }],
      progression: 0,
      etape_semantique: 'Terrain acquis',
      template_type: 'maison',
    };
  }
}

/**
 * M3.3 — Mapping sémantique : tâches → étapes du template
 */
async function mapTasksToTemplate(tasks, templateType) {
  const messages = [
    {
      role: 'system',
      content: `Tu associes chaque tâche d'un projet à une étape de template visuel.
Template actuel : ${templateType}
Retourne en JSON un tableau : [{"task_label": "...", "etape_template": "..."}]
Étapes disponibles pour "${templateType}" : ${getTemplateSteps(templateType).join(', ')}
Réponds UNIQUEMENT en JSON.`,
    },
    {
      role: 'user',
      content: `Tâches : ${JSON.stringify(tasks.map((t) => t.label))}`,
    },
  ];

  const response = await callLLM(messages, { temperature: 0.3 });
  try {
    return JSON.parse(response);
  } catch {
    return tasks.map((t) => ({ task_label: t.label, etape_template: 'fondations' }));
  }
}

/**
 * M4.4 — Génération de message de signal
 */
async function generateSignalMessage(context) {
  const { style, declencheur, projectName, etapeSemantique, progression, microAction, preuveProgres } = context;

  const styleProfiles = {
    sarcastique: "Tu es sarcastique mais bienveillant. Tu taquines gentiment l'utilisateur. Ton humoristique et décalé.",
    motivant: "Tu es un coach chaleureux et encourageant. Tu célèbres chaque progrès et tu inspires confiance.",
    epique: "Tu es un narrateur épique, style trailer de film. Chaque action est un chapitre d'une grande aventure.",
    gamer: "Tu es un HUD de jeu vidéo. Tu parles en termes de quests, XP, achievements, level up.",
  };

  const declencheurProfiles = {
    S1: `Célébration : une brique vient d'être posée ! L'étape "${etapeSemantique}" est atteinte. Félicite l'utilisateur et révèle l'étape suivante.`,
    S3: `Silence > 72h. L'utilisateur n'est pas venu. Montre la preuve de progrès (il a déjà fait ${progression}% — "${etapeSemantique}"). Propose UNE micro-action : "${microAction}". Jamais de reproche.`,
    S5: `L'utilisateur revient après un silence. Célébration pure ! Jamais de reproche, jamais de culpabilisation. Accueille-le comme un héros qui revient.`,
    S6: `Déblocage proche : il ne reste plus qu'une tâche avant une étape majeure. Motive fortement.`,
  };

  const messages = [
    {
      role: 'system',
      content: `${styleProfiles[style] || styleProfiles.motivant}\n\n${declencheurProfiles[declencheur] || declencheurProfiles.S3}\n\nRÈGLE D'OR : le message = preuve de progrès + une micro-action datée. Jamais de rouge, jamais de retard, jamais de culpabilisation.\n\nRéponds en texte brut, 2-3 phrases max. Inclus le nom du projet "${projectName}".`,
    },
  ];

  const response = await callLLM(messages, { maxTokens: 300, temperature: 0.8 });
  return response.trim();
}

/**
 * M7 — Lettre du futur (achèvement)
 */
async function generateFutureLetter(projectInfo) {
  const { projectName, dreamLabel, completedAt, summary } = projectInfo;

  const messages = [
    {
      role: 'system',
      content: `Tu écris une lettre courte et émouvante "venue du futur" — comme si le projet terminé écrivait à son créateur.
Le projet s'appelle "${projectName}" et il a permis de construire le rêve : "${dreamLabel}".
Date d'achèvement : ${completedAt}.
Résumé : ${summary}.

Écris une lettre de 4-6 lignes, personnelle, touchante, qui célèbre le chemin parcouru.
Ton : sincère, pas mielleux. Tu peux inclure une métaphore sur la construction.`,
    },
  ];

  const response = await callLLM(messages, { maxTokens: 500, temperature: 0.9 });
  return response.trim();
}

/**
 * Analyse de diff (webhook) — fichiers modifiés → tâches done
 */
async function analyzeDiff(diffData) {
  const { filesChanged, repoContext, tasks } = diffData;

  const messages = [
    {
      role: 'system',
      content: `Tu analyses les fichiers modifiés dans un commit Git pour déterminer quelles tâches sont accomplies.
Contexte du repo : ${repoContext || 'inconnu'}
Tâches actives : ${JSON.stringify(tasks.map((t) => ({ id: t.id, label: t.label, etape: t.etape_template })))}

Retourne en JSON :
{
  "completed_tasks": ["task_id_1", "task_id_2"],
  "progression_delta": X.X,
  "new_etape_semantique": "Nom de l'étape si on change d'étape, sinon null",
  "summary": "Résumé de ce qui a été fait en 1 phrase"
}

Si aucun fichier ne correspond clairement à une tâche, retourne completed_tasks vide.
Réponds UNIQUEMENT en JSON.`,
    },
    {
      role: 'user',
      content: `Fichiers modifiés : ${JSON.stringify(filesChanged)}`,
    },
  ];

  const response = await callLLM(messages, { temperature: 0.3 });
  try {
    return JSON.parse(response);
  } catch {
    return { completed_tasks: [], progression_delta: 0, new_etape_semantique: null, summary: 'Commit enregistré' };
  }
}

function getTemplateSteps(templateType) {
  const steps = {
    maison: ['terrain', 'fondations', 'murs', 'toit', 'fenetres', 'porte', 'jardin', 'emmenagement'],
    villa: ['terrain', 'fondations', 'murs', 'toit', 'piscine', 'facade', 'jardin_artisanal', 'emmenagement'],
    voiture: ['chassis', 'moteur', 'carrosserie', 'interieur', 'roues', 'electronique', 'finitions', 'route'],
    centre_aide: ['terrain', 'fondations', 'murs', 'toiture', 'amenagement_interieur', 'equipements', 'personnel', 'inauguration'],
    generique: ['etape_1', 'etape_2', 'etape_3', 'etape_4', 'etape_5', 'etape_6', 'etape_7', 'etape_8'],
  };
  return steps[templateType] || steps.generique;
}

module.exports = {
  callLLM,
  analyzeDreamPortfolio,
  analyzeRepo,
  mapTasksToTemplate,
  generateSignalMessage,
  generateFutureLetter,
  analyzeDiff,
  getTemplateSteps,
};
