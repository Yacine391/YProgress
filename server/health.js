const { modelChain } = require('./coach');

/** Configuration only. A successful live /api/coach call is the actual connection test. */
function healthHandler(req, res) {
  if (res.setHeader) res.setHeader('Cache-Control', 'no-store');
  const key = (process.env.OPENROUTER_API_KEY || '').trim();
  const looksValid = /^sk-or-v1-[A-Za-z0-9]{16,}$/.test(key);
  return res.status(200).json({
    ok: true, version: '17.0.0', model: modelChain()[0], visionModel: modelChain(true)[0],
    coach: {
      keyConfigured: Boolean(key), keyLooksValid: looksValid,
      status: !key ? 'MISSING_KEY' : !looksValid ? 'MALFORMED_KEY' : 'CONFIGURED_NOT_TESTED',
      liveVerified: false,
      hint: !key
        ? 'Ajoute OPENROUTER_API_KEY dans les variables du serveur ou de Vercel, puis redémarre ou redéploie.'
        : !looksValid
          ? 'La clé présente ne ressemble pas à une clé OpenRouter. Vérifie sa valeur côté serveur.'
          : 'Configuration présente. Envoie un message au coach pour tester réellement le fournisseur et le quota.',
      photoModes: ['meal', 'label'], maxImageBytes: 2097152,
      privacy: 'Une photo est transmise à OpenRouter et à son fournisseur uniquement après ta demande. Le serveur ne la conserve pas.'
    }
  });
}
module.exports = { healthHandler };
