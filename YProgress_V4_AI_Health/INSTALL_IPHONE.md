# Installer YProgress sur iPhone

## Option 1 — la plus simple pour tester

1. Sur un ordinateur, installer Node.js.
2. Décompresser le ZIP.
3. Ouvrir un terminal dans le dossier YProgress.
4. Lancer :
   npm install
   npx expo start
5. Installer « Expo Go » sur l'iPhone.
6. Vérifier que l'iPhone et l'ordinateur sont sur le même Wi-Fi.
7. Scanner le QR code avec l'appareil photo de l'iPhone et ouvrir le projet dans Expo Go.

Si le QR code ne fonctionne pas :
   npx expo start --tunnel

Cette méthode sert à tester l'application. Les notifications locales programmées par expo-notifications peuvent fonctionner dans Expo Go.

## Option 2 — vraie app installée avec son icône

Pour une build iOS distribuée directement sur ton iPhone :
1. Installer EAS CLI :
   npm install -g eas-cli
2. Se connecter :
   eas login
3. Configurer le projet :
   eas build:configure
4. Enregistrer ton iPhone si nécessaire :
   eas device:create
5. Lancer :
   eas build --platform ios --profile preview
6. Ouvrir le lien/QR code fourni par EAS sur l'iPhone et installer l'app.

Pour une build iOS interne (ad hoc), l'appareil doit être enregistré dans le profil de provisioning. Un compte Apple Developer payant est généralement nécessaire pour les credentials iOS et les fonctions natives avancées.

## Pour YProgress V2

La V2 utilisera un development build pour les fonctions natives avancées (Apple Health, caméra, notifications push intelligentes). Expo indique qu'Expo Go ne fournit pas les push notifications et qu'un development build est nécessaire pour celles-ci.
