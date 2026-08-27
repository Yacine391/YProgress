const FREE_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 5000);
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('INVALID_PAYLOAD');
  const serialized = JSON.stringify(payload);
  if (serialized.length > 50000) throw new Error('PAYLOAD_TOO_LARGE');
  const recentWorkouts = Array.isArray(payload.recentWorkouts) ? payload.recentWorkouts.slice(-30) : [];
  return {
    profile: payload.profile && typeof payload.profile === 'object' ? payload.profile : {},
    today: payload.today && typeof payload.today === 'object' ? payload.today : {},
    recentWorkouts,
    coachContext: payload.coachContext && typeof payload.coachContext === 'object' ? payload.coachContext : {}
  };
}

function buildPrompt(payload) {
  const { profile = {}, today = {}, recentWorkouts = [], coachContext = {} } = payload || {};
  return `Tu es YProgress Coach, un coach sportif et nutritionnel personnel. Réponds en français, de façon concrète, courte et motivante. Tu ne fais aucun diagnostic médical et tu ne prétends jamais connaître une donnée qui n'est pas fournie.

RÈGLES ABSOLUES
- Donne au maximum 3 priorités pour aujourd'hui.
- Utilise uniquement les données fournies ; distingue clairement observation et recommandation.
- Pour la musculation, exploite l'historique de charges/répétitions quand il existe. Ne propose pas une progression agressive.
- Si le sommeil est faible ou la récupération mauvaise, réduis le volume/intensité plutôt que de culpabiliser l'utilisateur.
- Pas de compensation punitive après un repas trop riche.
- Ne recommande ni dopage, ni substances interdites, ni régime extrême.
- Si une donnée importante manque, dis-le brièvement.

FORMAT
Commence par une ligne du type « Aujourd'hui : … ». Puis 2 à 3 puces avec des actions immédiatement utiles. Termine par une phrase courte de motivation. Pas de markdown complexe, pas de JSON.

DONNÉES UTILISATEUR
${JSON.stringify({ profile, today, recentWorkouts, coachContext })}`;
}

async function callOpenRouter(payload) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY manquante sur le serveur');
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'https://y-progress.vercel.app',
      'X-Title': 'YProgress Coach'
    },
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify({
      model: FREE_MODEL,
      messages: [{ role: 'user', content: buildPrompt(payload) }],
      temperature: 0.25,
      max_tokens: 500
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `OpenRouter HTTP ${response.status}`);
  return cleanText(data?.choices?.[0]?.message?.content);
}

async function coachHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const payload = validatePayload(req.body || {});
    const message = await callOpenRouter(payload);
    if (!message) throw new Error('Réponse IA vide');
    return res.status(200).json({ ok: true, message, model: FREE_MODEL, provider: 'openrouter-free' });
  } catch (error) {
    const clientError = ['INVALID_PAYLOAD','PAYLOAD_TOO_LARGE'].includes(error.message);
    console.error('[coach]', clientError ? error.message : 'provider_unavailable');
    return res.status(clientError ? 400 : 503).json({ ok: false, error: clientError ? error.message : 'COACH_UNAVAILABLE' });
  }
}

module.exports = { coachHandler, buildPrompt, validatePayload };
