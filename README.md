# YProgress

Coach sportif et nutritionnel personnel. Application locale mono-utilisateur,
déployée en PWA sur Vercel.

## Lancer

```bash
npm install
npm start            # Expo (iOS / Android / web)
npm run web          # web uniquement
npm run build:web    # export de production dans dist/
npm test             # suite complète (statique + moteur)
```

Node 22.12 ou plus : les tests chargent les modules ESM via `require()`.

## Structure

```
App.js                      Écrans et état de l'application
src/core/
  profile.js                Objectifs calculés (Mifflin-St Jeor + garde-fous)
  history.js                Journal quotidien persistant, bilans, dette de sommeil
  progression.js            Charges recommandées d'une semaine sur l'autre
  autopilot.js              Priorités du jour, détection de plateau, récupération
  intelligence.js           Recommandation de sommeil, apprentissage hebdomadaire
  groceryPlanner.js         Liste de courses sous contrainte de budget
  featureFlags.js           Intégrations natives désactivées tant qu'absentes
src/features/training/      Programme, exercices, vidéos, curriculum JJB
src/services/storage/       Accès unique au stockage (namespace versionné)
src/services/health/        Détection de sommeil (confirmé / estimé / inconnu)
src/design/theme.js         Tokens de design — aucune couleur en dur ailleurs
server/                     Endpoints IA (coach, health, limitation de débit)
api/                        Points d'entrée Vercel vers server/
tests/                      Suite de non-régression
```

## Coach IA

La clé OpenRouter reste côté serveur. Elle ne doit jamais apparaître dans une
variable `EXPO_PUBLIC_*` : elle finirait dans le bundle navigateur.

Variables Vercel (Settings → Environment Variables, puis **redéployer**) :

| Variable | Valeur |
|---|---|
| `OPENROUTER_API_KEY` | `sk-or-v1-…` |
| `OPENROUTER_MODEL` | `google/gemma-4-31b-it:free` |
| `APP_URL` | `https://y-progress.vercel.app` |

Vérification : `https://y-progress.vercel.app/api/health` doit renvoyer
`"status": "READY"`.

## Règles de développement

1. Modifier le module responsable, pas seulement `App.js`.
2. Ajouter ou adapter les tests.
3. `npm test` puis `npm run build:web` doivent passer avant tout commit.

La suite statique refuse notamment : une couleur en dur dans `App.js`, un écran
déclaré à l'intérieur de `App()`, un module jamais importé, un accès direct à
AsyncStorage, et l'absence de limitation de débit avant l'appel au fournisseur IA.
