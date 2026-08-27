# YProgress V15 — AI Coach

Application Expo mobile-first de nutrition, récupération et entraînement adaptatif. Le moteur déterministe calcule les charges suivantes à partir des performances réelles et du contexte de récupération ; OpenRouter sert uniquement à expliquer et coacher.

Test UI:
```bash
npm install
npx expo start
```

Architecture:
- `src/domain` : règles métier
- `src/services` : stockage, HealthKit, IA, notifications
- `src/features/training` : programme hebdomadaire et données d'exercices
- `src/core/progression.js` : moteur déterministe de progression des charges
- `server` : API IA sécurisée
- `docs` : architecture et roadmap

HealthKit nécessite une capability native iOS et des permissions utilisateur. Pour le développement iOS, utiliser une development build EAS.


## V9 intelligence foundation
Sleep auto-detection, Sleep Coach, cumulative fatigue, fridge/pantry inventory, grocery/budget contracts, receipt/restaurant contracts, coach memory, habit learning, uncertainty, privacy, offline queue and iOS feature flags are prepared. Native providers remain disabled until implemented.

## V15 — Coach IA réel

Le bouton « Analyser ma journée » appelle `/api/coach` sur Vercel. La clé OpenRouter reste côté serveur.

### Variables Vercel

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL` = `openrouter/free`
- `APP_URL` = URL du site

Le client web n'embarque aucune clé secrète. Sans serveur IA disponible, l'application garde son conseil local de secours.
