# YProgress V5 — Coach OS

## Objectif
Passer d'un tracker à un coach adaptatif qui croise :
- nutrition
- poids
- sommeil
- pas
- dépense active
- musculation
- MMA/JJB
- calendrier de vie
- récupération

## V5 déjà préparée
- nouvelle base UI/UX Coach OS
- dashboard adaptatif
- nutrition + photo caméra
- journal alimentaire
- objectifs calories/macros
- coach offline de secours
- endpoint `/coach` configurable via `EXPO_PUBLIC_AI_BASE_URL`
- notifications locales
- suivi sommeil et poids
- phases septembre / Tunisie / stage / école / accès libre
- architecture prête pour HealthKit

## Intégrations natives suivantes
1. HealthKit réel dans development build iOS.
2. Analyse vision réelle côté serveur.
3. Coach IA complet avec historique.
4. Ajustement calories basé sur moyenne glissante du poids.
5. Détection des journées sous-alimentées/surmenées.
6. Photos de progression avec comparaison par date.
7. Notifications contextuelles.
8. Tableau de bord hebdomadaire et mensuel.

## Sécurité
La clé IA ne doit jamais être embarquée dans l'app iOS. Utiliser un serveur intermédiaire et des variables d'environnement.
