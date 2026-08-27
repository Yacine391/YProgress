# Serveur IA V5

Variables :
- OPENROUTER_API_KEY
- OPENROUTER_MODEL (par défaut : openrouter/free)

Endpoints recommandés :
- POST /meal-analysis : image + contexte utilisateur -> aliments/macros/confiance
- POST /coach : poids + nutrition + sommeil + activité + entraînement -> recommandations
- POST /weekly-insights : historique 7 jours -> bilan et actions

Ne jamais mettre OPENROUTER_API_KEY dans App.js ou dans une variable EXPO_PUBLIC_*.
