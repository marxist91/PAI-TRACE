# ✅ TODO — Projet PIA

## Nouvelle directive PIA-TRACE - v3.2 (2026-08-18)

### Autonomie des terminaux - v3.2

- [x] Donner à LCT un import de manifeste autonome
- [x] Donner à Togo Terminal un import de manifeste autonome
- [x] Forcer l’affectation LCT ou Togo selon le rôle connecté
- [x] Bloquer les imports et réaffectations croisés entre terminaux
- [x] Isoler les historiques de manifestes par terminal
- [x] Isoler les tableaux de bord, vues à quai, mouvements et anomalies par terminal
- [x] Ajouter les attendus PIA propres à chaque terminal
- [x] Consolider les attendus LCT et Togo Terminal dans les espaces PAL et PIA

- [x] Retirer les espaces Client et Consignataire du produit actif
- [x] Conserver uniquement Logisticien PAL, Agent LCT, Agent Togo Terminal et Agent PIA
- [x] Bloquer l’authentification et le renouvellement de session des anciens rôles
- [x] Aligner la navigation sur Manifeste → Vue à quai → Sortie LCT/Togo Terminal → Entrée PIA → Séjour → Sortie PIA
- [x] Rendre la navigation latérale défilable tout en gardant Déconnexion visible
- [x] Ajouter Déconnexion au menu mobile
- [x] Retirer Client et Consignataire des formulaires, tableaux et libellés opérationnels
- [x] Mettre à jour la recette automatisée du nouveau parcours interne

- [x] Recentrer le produit sur les entrées/sorties de conteneurs entre le Port autonome de Lomé et la PIA
- [x] Ajouter l'import de manifeste Excel `.xlsx` (ATP, conteneur, B/L, terminal, dates, destination)
- [x] Ajouter les statuts `ATTENDU_PIA`, `VU_A_QUAI`, `SORTI_TERMINAL`, `ENTRE_PIA`, `SORTI_PIA`
- [x] Enregistrer séparément sortie LCT/Togo Terminal, entrée PIA et sortie PIA
- [x] Calculer le nombre de jours de séjour à la PIA
- [x] Créer la Vue à quai par jour, semaine et mois
- [x] Créer le registre des attendus, entrées et sorties PIA
- [x] Refaire le tableau de pilotage et les statistiques selon le nouveau flux
- [x] Migrer Prisma Postgres et regénérer les données de démonstration
- [x] Mettre à jour la recette automatisée du parcours métier
- [ ] Valider un exemple réel de manifeste PIA/GUCE et figer le modèle de colonnes
- [ ] Ajouter l'aperçu et la validation des lignes avant l'import définitif
- [ ] Ajouter un export Excel des listes quotidiennes et mensuelles
- [ ] Définir les règles de rapprochement en cas de B/L multi-conteneurs
- [ ] Valider avec LCT, Togo Terminal et PIA les champs réellement disponibles à chaque poste
- [ ] Préparer les connecteurs officiels si des API partenaires sont accordées

---

## Phase 0 : 🏗️ Fondations du Projet ✅ Terminée

> **Historique :** les tâches Client/Consignataire des phases ci-dessous sont conservées comme trace des versions précédentes, mais ces espaces sont désormais retirés par la directive v3.1.

### Initialiser le projet Expo avec TypeScript
- [x] Créer le projet avec `npx create-expo-app`
- [x] Configurer TypeScript strict
- [x] Mettre en place ESLint et Prettier
- [x] Initialiser le dépôt Git

### Configurer le backend (Node.js + Express + TypeScript)
- [x] Initialiser le projet avec `npm init`
- [x] Configurer TypeScript pour le backend
- [x] Mettre en place Prisma ORM avec Prisma Postgres
- [x] Créer le schéma de base de données initial (8 modèles)
- [x] Configurer et exécuter les migrations Prisma
- [x] Créer et exécuter le seed (données de test)
- [x] Configurer le client Prisma avec adaptateur PrismaPg
- [x] Script de vérification ✅ Connected

### Mettre en place l'authentification
- [x] Implémenter le modèle User (avec rôles Logisticien/Client)
- [x] Configurer bcrypt pour le hachage des mots de passe
- [x] Implémenter la génération et la validation des tokens JWT
- [x] Créer les endpoints d'inscription et de connexion
- [x] Protéger les routes API avec middleware d'authentification
- [x] Tester le flux d'authentification complet ✅

---

## Phase 1 : 🔐 Gestion des Utilisateurs (En cours)

### Service API
- [x] Créer le service Axios avec intercepteurs JWT
- [x] Interfaces TypeScript (LoginRequest, RegisterRequest, User, AuthResponse)

### Contexte d'authentification
- [x] Créer AuthProvider (login, register, logout)
- [x] Persistance du token via AsyncStorage
- [x] Hook useAuth pour les composants

### Écran de connexion (LoginScreen)
- [x] Formulaire email/mot de passe
- [x] Gestion des erreurs et loading
- [x] Redirection après connexion

### Écran d'inscription (RegisterScreen)
- [x] Formulaire complet (nom, prénom, email, téléphone, mot de passe)
- [x] Sélection du rôle (Client/Logisticien)
- [x] Validation des champs
- [x] Lien retour connexion

### Navigation
- [x] AuthStack (Login, Register) — non connecté
- [x] AppTab (Dashboard, Conteneurs, Profil) — connecté
- [x] Navigation conditionnelle selon l'état d'authentification

### Points à améliorer
- [x] Ajouter icônes aux onglets (React Navigation icons via @expo/vector-icons)
- [x] Rafraîchissement automatique du token JWT (refresh token côté backend + frontend)
- [x] Déconnexion automatique si token expiré (timer basé sur le refresh token)
- [x] Écrans de placeholder remplacés (Dashboard, Conteneurs, Profil)
- [x] Ajout des écrans Détail Conteneur et Formulaire Conteneur

---

## Phase 2 : 📦 Traçabilité des Conteneurs 🚧 En cours

### Modèle de données
- [x] Modèle Conteneur, Checkpoint, Mouvement déjà dans Prisma
- [x] Migration et seed enrichis
- [x] Ajouter les rôles CONSIGNATAIRE, CONTROLEUR_LCT, CONTROLEUR_TOGO et AGENT_PIA
- [x] Enregistrer l'affectation LCT ou Togo Terminal sur chaque conteneur

### Backend
- [x] Routes CRUD `/api/conteneurs` (liste, détail, création, modification, suppression)
- [x] Filtres par statut et recherche
- [x] Gestion des droits des six acteurs côté serveur
- [x] Isoler les conteneurs par client, consignataire, terminal ou étape PIA
- [x] Limiter chaque acteur à son type de checkpoint
- [x] Routes `/api/consignataires`
- [x] Routes `/api/checkpoints`
- [x] Création de checkpoint avec mise à jour auto du statut + mouvement

### Frontend
- [x] Services API conteneurs/consignataires/checkpoints
- [x] Écran Conteneurs connecté à l'API (liste, recherche, filtres, suppression)
- [x] Écran Détail Conteneur connecté à l'API (timeline checkpoints)
- [x] Écran Formulaire Conteneur connecté à l'API (création/édition)
- [x] Dashboard connecté aux vraies données

### Prochaines sous-tâches
- [x] Ajouter un écran / modal pour créer un checkpoint depuis le détail
- [x] Notifications lors des changements de statut
- [x] Tests API automatisés (santé, authentification et règles d'anomalies)

## Architecture

> **Important** : le projet PIA comprend deux interfaces utilisateur distinctes :
> - **App mobile chauffeur** (`frontend/`) : React Native Expo, 7 écrans fournis dans `frontend/assets/ecran/`
> - **App web logisticien / contrôleur terminal** (`web/`) : React + Vite, pour la gestion bureau et les contrôles LCT/Togo Terminal

### Web App — Logisticien / Contrôleur Terminal

- [x] Initialiser le projet Vite + React + TypeScript
- [x] Configurer Tailwind CSS 4
- [x] Configurer TanStack Query + React Router
- [x] AuthContext web avec persistance localStorage
- [x] Service API Axios (proxy Vite vers backend)
- [x] Page Login web
- [x] Layout avec navigation
- [x] Dashboard logisticien (stats + checkpoints récents + conteneurs récents)
- [x] Page Conteneurs (liste, filtres, recherche, suppression)
- [x] Page Détail Conteneur (timeline + ajout checkpoint)
- [x] Page Formulaire Conteneur (création / édition)
- [x] Page Checkpoints (file opérationnelle et postes de contrôle)
- [x] Page Mouvements (historique Prisma, recherche, filtres et accès au conteneur)
- [x] Page Anomalies (priorisation, indicateurs, filtres et file de traitement)
- [x] Règles d’anomalies par étape avec seuils, tests unitaires et données de démonstration stables
- [x] Répartir les parcours générés entre LCT et Togo Terminal sans mélange des deux checkpoints
- [x] Page Rapports & performance (indicateurs, répartition, exports)
- [x] Refonte visuelle web selon les maquettes Togo Port / PIA Trace
- [x] Refonte du shell PAL et du dashboard avec les données réelles du cahier des charges
- [x] Étendre le cockpit PAL sombre à toutes les pages web et unifier les icônes Phosphor
- [x] Remplacer les pages fictives Utilisateurs et Paramètres par des vues réelles et documentées
- [x] Vérifier visuellement toutes les routes web, y compris un parcours au statut Arrivé
- [x] Installer les dépendances (`npm install`)
- [x] Démarrer et tester en mode dev (`npm run dev`)
- [x] Centre de notifications web avec compteur non lu et accès au conteneur
- [x] Synchronisation Socket.IO des conteneurs, checkpoints, mouvements et anomalies
- [x] Création d'un checkpoint dans l'application mobile avec choix LCT ou Togo Terminal
- [x] Séparer l'espace Client du cockpit Logisticien et appliquer une navigation en lecture seule
- [x] Créer l'espace Consignataire avec sa compagnie et ses actions dédiées
- [x] Créer deux espaces distincts pour LCT et Togo Terminal
- [x] Créer l'espace Agent PIA pour réception, stockage, douane et livraison
- [x] Ajouter les comptes de test et répartir chaque consignataire sur les deux terminaux
- [x] Corriger le titre de rôle, la file opérationnelle et l'action principale sur écran moyen
- [x] Notifier la PIA après chaque sortie LCT ou Togo Terminal avec conteneur, B/L et ATP
- [x] Afficher en priorité les sorties terminal sous le libellé « Attendu à la PIA »
- [x] Ajouter la recherche par conteneur, B/L ou ATP dans le registre PIA
- [x] Rafraîchir les files et statistiques PIA en temps réel après une opération terminal
- [x] Tester automatiquement le relais sortie terminal → notification et registre PIA
- [x] Remonter en première ligne du dashboard PIA la dernière sortie terminal validée
- [x] Ajouter les filtres Attendus, Entrés et Sortis au registre PIA
- [x] Supprimer les événements de démonstration futurs et empêcher leur régénération
- [x] Afficher les dates de sortie terminal, entrée PIA et sortie PIA dans le registre des conteneurs
- [x] Remonter immédiatement la dernière unité validée en tête des files de tous les acteurs

## Prochaines Phases
- [x] Phase 3 : 📊 Tableaux de Bord & Interface
- [x] Phase 4 : 📈 Rapports & Statistiques
- [x] Phase 5 : 🔔 Notifications applicatives web & Temps Réel
- [ ] Notifications push natives Expo pour le mobile
- [ ] Phase 6 : 🧪 Tests & Qualité (démarrée : 8 tests automatisés passent)
- [x] Vérifier manuellement les six connexions et l'interface de chaque rôle
- [x] Vérifier les refus d'accès croisés LCT / Togo Terminal
- [x] Automatiser un scénario d'écriture complet Consignataire → Togo Terminal → PIA → Livraison
- [x] Nettoyer automatiquement le conteneur, les mouvements, checkpoints et notifications de recette
- [ ] Phase 7 : 🚀 Déploiement & Documentation
