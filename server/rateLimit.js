/**
 * Limitation de débit pour /api/coach.
 *
 * HONNÊTETÉ SUR LA PORTÉE : en environnement serverless (Vercel), l'état vit
 * en mémoire d'instance. Plusieurs instances = plusieurs compteurs, et une
 * instance froide repart à zéro. Ce n'est donc PAS une protection contre une
 * attaque distribuée. C'est une protection contre le cas réel et probable :
 * quelqu'un qui martèle l'URL publique et vide le quota OpenRouter.
 * Pour une garantie stricte, il faudrait un compteur partagé (Redis/KV).
 */

const WINDOWS = [
  { name: "burst", ms: 60_000, max: 6 },
  { name: "sustained", ms: 15 * 60_000, max: 25 },
  { name: "hourly", ms: 60 * 60_000, max: 60 }
];

// Plafond global de l'instance : dernier rempart si beaucoup d'IP différentes arrivent.
const GLOBAL = { ms: 60_000, max: 90 };

const MAX_TRACKED_CLIENTS = 5000;

function createLimiter({ windows = WINDOWS, global = GLOBAL, now = () => Date.now() } = {}) {
  const clients = new Map();
  let globalHits = [];

  function prune(list, cutoff) {
    let i = 0;
    while (i < list.length && list[i] < cutoff) i += 1;
    return i === 0 ? list : list.slice(i);
  }

  function sweep(current) {
    const longest = Math.max(...windows.map((w) => w.ms));
    for (const [key, hits] of clients) {
      const kept = prune(hits, current - longest);
      if (kept.length === 0) clients.delete(key);
      else clients.set(key, kept);
    }
  }

  return {
    /** @returns {{allowed:boolean, retryAfter?:number, reason?:string}} */
    check(clientId) {
      const current = now();
      const key = String(clientId || "unknown");

      globalHits = prune(globalHits, current - global.ms);
      if (globalHits.length >= global.max) {
        return { allowed: false, retryAfter: Math.ceil(global.ms / 1000), reason: "global" };
      }

      // Garde-fou mémoire : au-delà, on nettoie avant d'accepter une nouvelle clé.
      if (clients.size > MAX_TRACKED_CLIENTS) sweep(current);

      const longest = Math.max(...windows.map((w) => w.ms));
      const hits = prune(clients.get(key) || [], current - longest);

      for (const w of windows) {
        const inWindow = hits.filter((t) => t > current - w.ms);
        if (inWindow.length >= w.max) {
          const oldest = inWindow[0];
          const retryAfter = Math.max(1, Math.ceil((oldest + w.ms - current) / 1000));
          clients.set(key, hits);
          return { allowed: false, retryAfter, reason: w.name };
        }
      }

      hits.push(current);
      clients.set(key, hits);
      globalHits.push(current); // sans cet incrément le plafond global ne comptait rien
      return { allowed: true };
    },
    reset() {
      clients.clear();
      globalHits = [];
    },
    size() {
      return clients.size;
    }
  };
}

/**
 * Identifiant du client. Derrière Vercel, x-forwarded-for est renseigné par la
 * plateforme ; on ne garde que la première adresse (le client d'origine).
 * Aucune IP n'est journalisée : elle ne sert que de clé en mémoire.
 */
function clientKey(req) {
  const headers = (req && req.headers) || {};
  const forwarded = headers["x-forwarded-for"] || headers["X-Forwarded-For"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded) && forwarded.length) return String(forwarded[0]).trim();
  const real = headers["x-real-ip"];
  if (typeof real === "string" && real.trim()) return real.trim();
  return (req && req.socket && req.socket.remoteAddress) || "unknown";
}

module.exports = { createLimiter, clientKey, WINDOWS, GLOBAL };
