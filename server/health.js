/**
 * Diagnostic public de la configuration IA.
 * Ne renvoie JAMAIS la clé : seulement si elle est présente et bien formée.
 * Permet de distinguer « coach opérationnel » de « repli local silencieux ».
 */

function healthHandler(req, res) {
  const key = process.env.OPENROUTER_API_KEY || '';
  const looksValid = /^sk-or-v1-[A-Za-z0-9]{16,}$/.test(key.trim());
  return res.status(200).json({
    ok: true,
    version: '15.6.0',
    model: process.env.OPENROUTER_MODEL || 'openrouter/free',
    appUrl: process.env.APP_URL || null,
    coach: {
      keyConfigured: key.length > 0,
      keyLooksValid: looksValid,
      // Diagnostic actionnable plutôt qu'un simple booléen.
      status: !key ? 'MISSING_KEY' : looksValid ? 'READY' : 'MALFORMED_KEY',
      hint: !key
        ? "Ajoute OPENROUTER_API_KEY dans Vercel (Settings > Environment Variables), puis redéploie."
        : looksValid
          ? "Clé présente côté serveur. Si le coach échoue, la cause est le fournisseur ou le quota."
          : "La clé est présente mais ne ressemble pas à une clé OpenRouter (format attendu : sk-or-v1-...)."
    }
  });
}

module.exports = { healthHandler };
