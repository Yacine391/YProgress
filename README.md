# YProgress 17 — une routine qui tient

Version du 27 octobre 2026. Refonte de l’application Expo / React Native, utilisable sur le web et préparée pour mobile. Aucun compte utilisateur ni clé IA n’est inclus.

## Ouvrir la version web incluse

Il faut Node.js 22.12 ou plus récent. Le dossier `dist/` contient déjà le build : aucune installation npm n’est nécessaire pour l’essayer.

Sous Ubuntu, depuis ce dossier :

```bash
bash LANCER.sh
```

Puis ouvre **http://localhost:8787**. Garde le terminal ouvert. `Ctrl+C` arrête le serveur. Sur Windows : double-clic sur `LANCER.bat` avec Node installé.

N’ouvre pas directement `dist/index.html` : l’application et son API ont besoin du serveur HTTP. Garde la même adresse et le même navigateur pour retrouver les données locales. Depuis un téléphone, le localhost du téléphone ne désigne pas l’ordinateur : utilise un déploiement HTTPS ou le serveur sur ton réseau local avec sa bonne adresse. La caméra du navigateur exige généralement HTTPS, sauf sur localhost.

## Ce qui a changé

- Interface sombre graphite et vert citron ; menu latéral ordinateur et barre de navigation mobile.
- Date calculée en Europe/Paris, actualisée à minuit et au retour dans l’application. Départ de référence : 27/10/2026, horizon de travail : 27/04/2027.
- Poids déclaré de départ actualisé à **57 kg**, contre l’ancien repère de 55 kg. Aucun entraînement passé inventé. L’âge et la taille de l’ancienne version doivent être confirmés avant l’affichage d’un objectif calorique.
- **MMA mardi et jeudi. Musculation lundi et samedi**, environ 55–80 minutes, sous 90 minutes. Mercredi facultatif et léger ; vendredi/dimanche récupération. Les deux premières semaines du programme ne commencent pas à vieillir tant qu’aucune séance n’a été faite.
- Version express 20–25 min et version allégée. Une séance courte compte ; aucune séance manquée n’entraîne de rattrapage punitif.
- Catalogue de 17 exercices : muscles principaux et complémentaires, sous-zones, consignes, alternatives et démonstration propre à chaque mouvement. Épaule : trois faisceaux du deltoïde ; coiffe de quatre muscles distincte. Les lecteurs YouTube sont limités à un extrait de deux minutes ; deux mouvements renvoient à leur page MuscleWiki dédiée. La lecture externe dépend de la connexion, de la disponibilité et des restrictions de la plateforme.
- Saisie par série : kg, répétitions/secondes, répétitions en réserve (RIR), case faite, minuteur de repos et note. Seules les séries cochées sont ajoutées au carnet. Les charges de départ ne sont pas imposées ; la progression s’appuie sur deux dates réellement entraînées et maîtrisées.
- Repas, hydratation, whey selon étiquette et protéines déjà notées, créatine quotidienne, fiches produit et notes d’emballage. À 57 kg : repère de 91–114 g de protéines totales, cible pratique 110 g. Créatine monohydrate : 3 g/j, sans charge ni double dose après oubli, pour un adulte en bonne santé. Un journal vide ou incomplet ne produit pas de prescription de whey.
- Courbe de poids sans données fictives, mensurations, charges et photos de suivi. L’image fournie est marquée comme **simulation IA d’inspiration**, jamais comme résultat promis. Le poids ne mesure pas à lui seul le muscle gagné.
- Profil, sommeil, énergie, notes, déclencheur de motivation et export/restauration JSON complets. Les anciennes données locales restent conservées dans un instantané `legacy` ; elles ne sont pas effacées.

## Activer et tester le coach IA

Le serveur utilise OpenRouter. La clé doit rester côté serveur : jamais dans `App.js`, `dist/`, une photo, un message ou une variable `EXPO_PUBLIC_*`.

```bash
cp .env.example .env.local
# Ouvre .env.local dans ton éditeur et renseigne OPENROUTER_API_KEY.
bash LANCER.sh
```

Aucun appel IA réel n’a été validé pendant cette livraison, car aucune clé n’a été fournie. Le parcours réseau et les analyses sont testés avec un fournisseur simulé. Le diagnostic « configuration présente » ne signifie jamais « IA testée ». Une réponse réussie à ta propre question confirme la connexion à cet instant. Les modèles gratuits peuvent changer, être saturés ou manquer de quota : le modèle texte et le modèle vision sont configurables dans `.env.local`.

Dans **Coach IA** :

1. Envoie une question simple, puis vérifie la réponse et l’état affiché.
2. Choisis **Photo de mon plat** ou **Étiquette / emballage**, puis caméra ou galerie.
3. Pour un emballage, photographie le tableau nutritionnel net. Indique les grammes réellement consommés si tu les connais. Une simple face avant ne suffit pas.
4. Clique sur **Analyser** : la photo part alors vers OpenRouter et son fournisseur. Elle n’est pas conservée par le serveur ni dans les conversations locales.
5. Vérifie et corrige le résultat. Pour une étiquette pour 100 g, entre ta portion. Confirme explicitement avant l’ajout au journal. Les valeurs inconnues restent inconnues, jamais remplacées par zéro.

Une photo de plat produit une estimation : huile, sauce, ingrédients cachés et masse ne sont pas mesurables précisément sur l’image. Pour la créatine, le coach peut lire et expliquer la quantité active visible ; confirme-la toi-même dans la fiche produit. Les photos du journal de progression restent locales et ne sont pas envoyées au coach.

## Développement et déploiement

```bash
npm ci
npm test
npm run web          # Expo ; l’API est sur le serveur inclus, ou configure EXPO_PUBLIC_AI_BASE_URL
npm run build:web    # reconstruit dist/
npm run preview      # sert dist/ + /api/*, charge .env.local si présent
```

Pour le développement Expo web séparé : lance aussi le serveur inclus et utilise `EXPO_PUBLIC_AI_BASE_URL=http://localhost:8787`. Une application native doit pointer vers une adresse HTTPS accessible à son appareil, pas le localhost du téléphone. La clé fournisseur n’est jamais publique.

Sur Vercel : framework Other, `npm run build:web`, sortie `dist`, fonctions `api/coach.js` et `api/health.js`. Configure `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` et éventuellement `OPENROUTER_VISION_MODEL`, puis redéploie. Le ZIP ne déploie ni ne modifie aucun site existant.

## Données et limites de validation

Le journal reste dans le navigateur/appareil. Effacer les données, changer de domaine, de port ou de navigateur peut le rendre inaccessible. Exporte régulièrement le JSON depuis Profil ; la sauvegarde contient aussi les photos de suivi et doit rester privée. Pas de synchronisation cloud automatique ni de notification distante garantie.

Les tests couvrent moteurs, dates Paris, sauvegardes et migrations, portions, contrats client/serveur, erreurs IA et 36 rendus React avec données initiales et réelles. Le build de production a été généré. Le navigateur de contrôle distant n’accédait pas au localhost du projet : aucune validation visuelle ou interaction réelle sur téléphone n’est annoncée. Caméra, lecteurs externes et appel fournisseur réel restent à essayer dans ton environnement.

Les limites de débit sont locales à une instance serveur ; un déploiement public multi-instance nécessite une protection de quota partagée. Ce projet est destiné à un usage personnel.

## Références

Choix de programme et de suppléments documentés dans `src/core/trainingPlan.js` et `src/core/nutrition.js` :

- ACSM, recommandations musculation 2026 : https://acsm.org/resistance-training-guidelines-update-2026/
- ISSN, protéines : https://link.springer.com/article/10.1186/s12970-017-0177-8
- ISSN, créatine : https://link.springer.com/article/10.1186/s12970-017-0173-z
- Cleveland Clinic, deltoïde : https://my.clevelandclinic.org/health/body/21875-deltoid-muscles
- API multimodale : https://openrouter.ai/docs/guides/overview/multimodal/image-understanding

Si tu as une maladie rénale, un traitement ou une fatigue persistante, demande un avis médical avant de suivre les repères de compléments. L’objectif des six mois est la constance et une progression mesurée, sans promesse de résultat identique à l’image IA.
