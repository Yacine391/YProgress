const { createLimiter, clientKey } = require('./rateLimit');

/**
 * Chaîne de modèles, essayés dans l'ordre.
 * Le premier est stable et bon en français ; openrouter/free ferme la marche
 * car c'est un routeur aléatoire : utile en secours, mauvais en principal
 * (la qualité et le style changent à chaque appel).
 * Un modèle gratuit peut être momentanément saturé : on bascule au suivant.
 */
const DEFAULT_MODEL = 'google/gemma-4-31b-it:free';
const FALLBACK_MODELS = ['nvidia/nemotron-3-super-120b-a12b:free', 'openrouter/free'];
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Budget total pour l'ensemble des tentatives : une fonction serverless a une
// durée maximale, et l'utilisateur attend devant son écran.
const TOTAL_BUDGET_MS = 20000;
const PER_MODEL_MS = 9000;

function modelChain() {
  const configured = (process.env.OPENROUTER_MODEL || '').trim();
  const chain = configured ? [configured] : [DEFAULT_MODEL];
  for (const m of [DEFAULT_MODEL, ...FALLBACK_MODELS]) if (!chain.includes(m)) chain.push(m);
  return chain;
}

const limiter = createLimiter();

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 5000);
}

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);
const obj = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const arr = (value, max) => (Array.isArray(value) ? value.slice(-max) : []);

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('INVALID_PAYLOAD');
  const serialized = JSON.stringify(payload);
  if (serialized.length > 50000) throw new Error('PAYLOAD_TOO_LARGE');

  return {
    profile: obj(payload.profile),
    today: obj(payload.today),
    recentWorkouts: arr(payload.recentWorkouts, 30),
    coachContext: obj(payload.coachContext),
    // Ajoutés en V15.5 : sans eux le coach ne pouvait pas justifier une charge.
    week: obj(payload.week),
    plateau: obj(payload.plateau),
    recovery: num(payload.recovery),
    planned: arr(payload.planned, 12)
  };
}

function line(label, value) {
  return value === null || value === undefined || value === '' ? null : `${label} : ${value}`;
}

function describeSession(planned) {
  if (!planned.length) return 'Aucune charge à recommander aujourd’hui (repos ou activité libre).';
  return planned
    .map((item) => {
      const parts = [
        `${item.name}`,
        item.recommendedLoad != null ? `charge conseillée ${item.recommendedLoad} kg` : null,
        item.lastLoad != null ? `semaine précédente ${item.lastLoad} kg` : null,
        item.sets && item.reps ? `${item.sets} × ${item.reps}` : null,
        item.action ? `décision moteur : ${item.action}` : null,
        item.reason ? `motif : ${item.reason}` : null
      ].filter(Boolean);
      return `- ${parts.join(' • ')}`;
    })
    .join('\n');
}

function buildPrompt(payload) {
  const { profile = {}, today = {}, recentWorkouts = [], coachContext = {}, week = {}, plateau = {}, recovery = null, planned = [] } = payload || {};

  const facts = [
    line('Poids', profile.weight ? `${profile.weight} kg` : null),
    line('Objectif', profile.goal),
    line('Phase', profile.phase),
    line('Cibles du jour', profile.targets ? `${profile.targets.calories} kcal, ${profile.targets.protein} g de protéines, ${profile.targets.steps} pas` : null),
    line('Maintenance estimée', profile.maintenance ? `${profile.maintenance} kcal` : null)
  ].filter(Boolean).join('\n');

  const dayFacts = [
    line('Consommé', today.total ? `${Math.round(today.total.calories || 0)} kcal, ${Math.round(today.total.protein || 0)} g de protéines` : null),
    line('Pas', today.steps),
    line('Sommeil', today.sleepMin ? `${Math.floor(today.sleepMin / 60)} h ${today.sleepMin % 60} min` : 'non renseigné'),
    line('Hydratation', today.water != null ? `${today.water} / ${today.waterTarget} ml` : null),
    line('Séance prévue', today.gym ? 'musculation' : today.jjb ? 'JJB' : 'aucune'),
    line('Score de récupération', recovery != null ? `${recovery}/100` : null)
  ].filter(Boolean).join('\n');

  const weekFacts = week.sampleDays
    ? [
      line('Jours enregistrés', week.sampleDays),
      line('Calories moyennes', week.avgCalories),
      line('Protéines moyennes', week.avgProtein ? `${week.avgProtein} g` : null),
      line('Pas moyens', week.avgSteps),
      line('Sommeil moyen', week.avgSleepMin ? `${Math.floor(week.avgSleepMin / 60)} h ${week.avgSleepMin % 60} min` : null),
      line('Dette de sommeil', week.sleepDebtMin ? `${week.sleepDebtMin} min sur 7 jours` : null),
      line('Variation de poids', week.weightChange != null ? `${week.weightChange} kg` : null)
    ].filter(Boolean).join('\n')
    : 'Pas encore assez de journées enregistrées pour une moyenne hebdomadaire.';

  const plateauFacts = plateau.reason
    ? `Historique de pesées insuffisant pour conclure (${plateau.reason}).`
    : plateau.detected
      ? `Plateau détecté : ${plateau.deltaKgPerWeek} kg/semaine. Adaptation possible : +${plateau.suggestedCalories} kcal.`
      : plateau.deltaKgPerWeek != null
        ? `Pas de plateau : ${plateau.deltaKgPerWeek} kg/semaine.`
        : 'Détection de plateau indisponible.';

  return `Tu es YProgress Coach, un coach sportif et nutritionnel personnel. Réponds en français, de façon concrète, courte et motivante. Tu ne fais aucun diagnostic médical et tu ne prétends jamais connaître une donnée qui n'est pas fournie.

RÈGLES ABSOLUES
- Donne au maximum 3 priorités pour aujourd'hui.
- Utilise uniquement les données fournies ; distingue clairement observation et recommandation.
- Les charges conseillées ci-dessous viennent du moteur de progression de l'application. Ne les contredis pas : explique-les en une phrase (pourquoi ça monte, pourquoi ça reste, pourquoi ça descend).
- Si le sommeil est faible ou la récupération mauvaise, réduis le volume/intensité plutôt que de culpabiliser l'utilisateur.
- Pas de compensation punitive après un repas trop riche.
- Ne recommande ni dopage, ni substances interdites, ni régime extrême. Ne propose jamais de descendre sous les cibles caloriques fournies.
- Si une donnée importante manque, dis-le brièvement au lieu de l'inventer.

FORMAT
Commence par une ligne du type « Aujourd'hui : … ». Puis 2 à 3 puces avec des actions immédiatement utiles. Si une charge est conseillée, consacre une puce à l'expliquer. Termine par une phrase courte de motivation. Pas de markdown complexe, pas de JSON.

PROFIL
${facts || 'Profil non renseigné.'}

AUJOURD'HUI
${dayFacts || 'Aucune donnée pour aujourd’hui.'}

SEPT DERNIERS JOURS
${weekFacts}

TENDANCE DE POIDS
${plateauFacts}

SÉANCE DU JOUR ET CHARGES CALCULÉES
${describeSession(planned)}

CONTEXTE
${JSON.stringify(coachContext)}

HISTORIQUE D'ENTRAÎNEMENT RÉCENT
${JSON.stringify(recentWorkouts.slice(-10))}`;
}

async function askModel(model, prompt, key, timeoutMs = PER_MODEL_MS) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'https://y-progress.vercel.app',
      'X-Title': 'YProgress Coach'
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.25,
      max_tokens: 600
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `OpenRouter HTTP ${response.status}`);
  return cleanText(data?.choices?.[0]?.message?.content);
}

async function callOpenRouter(payload) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY manquante sur le serveur');
  const prompt = buildPrompt(payload);
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError = null;
  for (const model of modelChain()) {
    const remaining = deadline - Date.now();
    // Moins de 2 s restantes : inutile de lancer un appel qu'on devra couper.
    if (remaining < 2000) break;
    try {
      const message = await askModel(model, prompt, key, Math.min(PER_MODEL_MS, remaining));
      if (message) return { message, model };
      lastError = new Error('Réponse IA vide');
    } catch (error) {
      lastError = error;
      console.error('[coach] modèle indisponible:', model);
    }
  }
  throw lastError || new Error('Aucun modèle disponible');
}

async function coachHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  // La clé OpenRouter est une ressource limitée : on filtre avant d'appeler le fournisseur.
  const gate = limiter.check(clientKey(req));
  if (!gate.allowed) {
    res.setHeader('Retry-After', String(gate.retryAfter));
    return res.status(429).json({
      ok: false,
      error: 'RATE_LIMITED',
      retryAfter: gate.retryAfter,
      message: 'Trop de demandes d’analyse coup sur coup. Réessaie dans un instant.'
    });
  }

  try {
    const payload = validatePayload(req.body || {});
    const { message, model } = await callOpenRouter(payload);
    return res.status(200).json({ ok: true, message, model, provider: 'openrouter-free' });
  } catch (error) {
    const clientError = ['INVALID_PAYLOAD', 'PAYLOAD_TOO_LARGE'].includes(error.message);
    console.error('[coach]', clientError ? error.message : 'provider_unavailable');
    return res.status(clientError ? 400 : 503).json({ ok: false, error: clientError ? error.message : 'COACH_UNAVAILABLE' });
  }
}

module.exports = { coachHandler, buildPrompt, validatePayload, limiter, modelChain, DEFAULT_MODEL };
