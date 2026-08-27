# YProgress V4 — AI + Apple Santé

Cette version ajoute les vraies briques techniques demandées :
- Apple HealthKit : pas, poids, sommeil, énergie active, exercice
- vraie caméra iPhone pour photographier les repas
- serveur IA séparé pour analyser les photos via OpenRouter
- coach IA adaptatif
- notifications locales
- interface Liquid / iOS
- planning septembre → février

## Installation JS

```bash
npm install
npx expo install --fix
```

## Test Expo Go
La caméra et l'UI peuvent être testées avec Expo Go. HealthKit nécessite la development build native.

## Development build iOS

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile development
```

EAS Build réalise la compilation iOS dans le cloud. Sur Linux, tu n'as pas besoin de Xcode localement, mais les credentials Apple restent nécessaires pour installer une build iOS sur ton appareil.

## AI
Voir `AI_SERVER.md`.
