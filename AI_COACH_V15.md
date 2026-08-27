# YProgress V15 — vrai Coach IA

Le Coach IA utilise une fonction serveur `/api/coach` sur Vercel. La clé OpenRouter n'est jamais envoyée au navigateur.

## Déploiement Vercel

Dans le projet Vercel, ajouter les variables d'environnement :

- `OPENROUTER_API_KEY` = ta clé OpenRouter
- `OPENROUTER_MODEL` = `openrouter/free`
- `APP_URL` = l'URL publique du site

Puis redéployer.

## Politique coût

YProgress demande explicitement le routeur `openrouter/free`. Aucune clé ni modèle payant n'est embarqué dans le client. Si OpenRouter refuse la requête ou si la clé manque, l'application conserve son conseil local de secours.

## Données envoyées au coach

Profil, objectifs, données du jour, hydratation, sommeil, activité, état gym/JJB et historique récent des charges/répétitions. Aucune clé secrète n'est envoyée.
