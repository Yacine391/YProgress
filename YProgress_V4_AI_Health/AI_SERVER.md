# YProgress AI — serveur privé

La clé OpenRouter **ne doit pas être mise dans l'application iPhone**. Le serveur conserve la clé et l'iPhone appelle uniquement `/analyze-meal` et `/coach`.

## Linux

```bash
cd ai-server
npm install
export OPENROUTER_API_KEY="TA_CLE_OPENROUTER"
export OPENROUTER_MODEL="openrouter/free"
npm start
```

Pour que l'iPhone sur le même Wi-Fi puisse joindre le serveur, récupère l'IP du PC :

```bash
hostname -I
```

Puis lance Expo avec :

```bash
export EXPO_PUBLIC_AI_BASE_URL="http://IP_DU_PC:8787"
npx expo start
```

Le routeur `openrouter/free` peut sélectionner automatiquement un modèle gratuit compatible avec l'analyse d'image lorsque la requête exige la vision. Voir la documentation OpenRouter sur les images et les modèles gratuits.

## Important

HealthKit est natif iOS : cette partie ne fonctionnera pas dans Expo Go. Il faut une development build iOS. Comme tu es sous Linux, EAS Build permet de construire la version iOS à distance, mais il faudra un compte Apple Developer pour installer la build sur ton iPhone.
