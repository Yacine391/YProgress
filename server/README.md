# API YProgress 18

Node 22.12+ ; aucune dépendance serveur à installer.

```bash
# À la racine du projet :
cp .env.example .env.local
# Renseigner OPENROUTER_API_KEY dans .env.local, puis :
npm run build:web
node --env-file-if-exists=.env.local server/index.js
```

Ouvrir http://localhost:8787 : ce serveur sert le site exporté ET les endpoints.
`/api/health` indique seulement si la configuration existe. Une réponse réussie
à un message ou une photo confirme le fonctionnement du fournisseur à cet instant.
Aucune clé API n'est incluse dans ce projet. Aucun appel réel n'a donc pu être
validé pendant sa préparation ; les tests fournisseur utilisent des mocks explicites.

## Contrat

`POST /api/coach`, `Content-Type: application/json` :

```json
{
  "message": "Peux-tu lire le tableau nutritionnel ?",
  "context": { "profile": { "weight": 57 } },
  "mode": "label",
  "portionGrams": 30,
  "imageDataUrl": "data:image/jpeg;base64,..."
}
```

- `mode` : `chat` par défaut, `meal` pour un plat, `label` pour un emballage.
- Les modes photo requièrent une photo JPEG, PNG ou WebP valide.
- Image : 2 Mio décodés maximum ; requête JSON complète : 3 Mio maximum.
- `portionGrams` : facultatif, strictement positif, maximum 5 000 g.
- `context` : profil / journée / historique, limité avec le texte à 50 000 octets.
- Pour une image, le serveur utilise `OPENROUTER_VISION_MODEL`, ou le modèle
  multimodal par défaut. Il ne remplace jamais la photo par un appel texte seul.

Succès : `ok`, `reply` (texte français), `message` (alias compatible), `model`,
`provider`. Les analyses photo ajoutent `nutrition` et `requiresConfirmation: true`.
Les champs nutritionnels `calories`, `protein`, `carbs`, `fat` restent `null` si
inconnus. `basis` vaut `portion`, `per100g` ou `unknown` ; `confidence` vaut `low`,
`medium` ou `high`. Une photo de plat ne peut pas être rendue avec `high`.
Une étiquette renvoyée pour 100 g est convertie par le serveur lorsque la portion
est fournie ; les valeurs originales restent dans `nutrition.per100g`.
Une valeur par 100 ml nécessite un volume ou une densité connue : ne jamais
traiter automatiquement des millilitres comme des grammes.

Toujours présenter les valeurs comme un brouillon modifiable et demander la
confirmation de l'utilisateur avant de créer une entrée au journal alimentaire.
Une image ne prouve ni la masse d'un plat ni la présence d'un ingrédient caché.

Les erreurs renvoient `ok: false`, `error` (code) et `message` (explication), avec
400 / 405 / 413 / 429 / 502 / 503 selon le cas. Le délai total fournisseur est
limité à 24 secondes. Les détails sensibles du fournisseur ne sont pas exposés.
La limitation de débit reste en mémoire d'instance ; elle ne constitue pas un
quota global partagé entre toutes les instances Vercel.

## Confidentialité

Le clic explicite sur « analyser » doit précéder l'envoi. Les photos vont à
OpenRouter et au fournisseur du modèle ; leurs politiques de traitement
s'appliquent. Ce serveur ne sauvegarde ni les photos ni les conversations et ne
journalise pas leurs contenus. Les entrées utilisateur restent gérées par le
stockage local de l'application. Garder la clé uniquement côté serveur.

## Vérification

```bash
node tests/server/run.js
```

17 tests vérifient le payload multimodal, les portions, les inconnues, les erreurs,
les limites et un vrai échange HTTP local. Les réponses IA sont simulées.

Sources officielles consultées le 27 octobre 2026 :
- https://openrouter.ai/docs/guides/overview/multimodal/image-understanding
- https://openrouter.ai/docs/api/reference/parameters
- https://openrouter.ai/google/gemma-4-31b-it:free
