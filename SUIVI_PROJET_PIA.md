# 📋 Projet PIA — Suivi de Réalisation

> **Dernière mise à jour :** 2026-08-18
>
> **Version fonctionnelle :** 3.2 - terminaux autonomes et consolidation PIA
>
> **Note :** le projet comprend désormais deux fronts : l'application mobile chauffeur (`frontend/`) et l'application web logisticien/contrôleur (`web/`).
>
> **Agent PIA créé :** `.github/agents/pia-agent.agent.md`

## 🚀 Gestion des entrées et sorties de conteneurs du Port autonome de Lomé vers la PIA

## Référence fonctionnelle v3.1

Le flux de référence est désormais : **manifeste Excel → Vu à quai → sortie LCT ou Togo Terminal → entrée PIA → séjour PIA → sortie vers le pays de destination**.

| Fonction | État |
|---|---|
| Import du manifeste `.xlsx` avec ATP, conteneur/B/L, terminal, prévision PIA, VAQ et destination | Réalisé |
| Liste des conteneurs attendus par jour, semaine ou mois | Réalisé |
| Vue à quai basée sur la date de débarquement/VAQ | Réalisé |
| Sortie distincte aux checkpoints LCT et Togo Terminal | Réalisé |
| Entrée et sortie PIA horodatées | Réalisé |
| Calcul du séjour courant et du séjour moyen PIA | Réalisé |
| Statistiques sorties terminaux, entrées/sorties PIA | Réalisé |
| Validation sur un manifeste réel PIA/GUCE | À faire dès réception d'un exemple |
| Connexion automatique aux systèmes partenaires | À étudier sous réserve d'accès API et d'accord institutionnel |

Les anciens statuts de parcours restent temporairement présents pour compatibilité avec l'historique, mais ne constituent plus le circuit cible.

### Acteurs actifs

Le produit n’expose plus d’espace Client ni Consignataire. Les quatre rôles actifs sont : **Logisticien PAL**, **Agent LCT**, **Agent Togo Terminal** et **Agent PIA**. Les anciens rôles restent provisoirement dans le schéma de base de données uniquement pour préserver l’historique ; leur connexion, leur rafraîchissement de session et leur accès aux conteneurs sont refusés.

### Corrections v3.1 réalisées le 18 août 2026

- [x] Barre latérale rendue défilable sans masquer le bouton Déconnexion
- [x] Bouton Déconnexion ajouté au menu mobile
- [x] Navigation réordonnée selon le parcours Manifeste → Vue à quai → Sortie terminal → PIA
- [x] Suppression des mentions Client et Consignataire dans les vues actives
- [x] Connexions et anciens refresh tokens Client/Consignataire refusés côté serveur
- [x] Création manuelle d’un conteneur sans client ni consignataire à saisir
- [x] Pages Sorties terminaux, Mouvements, Agents et Paramètres alignées sur le nouveau flux
- [x] Recette automatisée recentrée sur Logisticien → Togo Terminal → PIA

### Autonomie LCT et Togo Terminal - v3.2

- [x] Autoriser LCT et Togo Terminal à importer leurs propres manifestes Excel
- [x] Affecter automatiquement chaque import au terminal du compte connecté
- [x] Ignorer une ligne Excel qui désigne explicitement l’autre terminal
- [x] Empêcher un terminal de réaffecter un conteneur déjà rattaché à l’autre terminal
- [x] Afficher à chaque terminal uniquement l’historique d’import de ses agents
- [x] Ajouter « Mes manifestes » à la navigation LCT et Togo Terminal
- [x] Ajouter « Importer mon manifeste » aux tableaux de bord terminaux
- [x] Limiter les statistiques LCT et Togo Terminal à leur propre périmètre
- [x] Afficher au Logisticien PAL et à la PIA les attendus séparés par terminal

---

## 📖 Aperçu du Projet

| Élément | Détail |
|---------|--------|
| **Nom du projet** | Traçabilité des conteneurs en transit vers la PIA |
| **Objectif** | Assurer la traçabilité des conteneurs du manifeste jusqu’à leur sortie de la PIA |
| **Cible** | Application web interne pour le PAL, LCT, Togo Terminal et la PIA ; mobile terrain conservé à évaluer |
| **Public** | **Web** : Logisticien PAL, Agent LCT, Agent Togo Terminal et Agent PIA. |

## Comptes de recette manuelle

Tous les comptes de démonstration utilisent le mot de passe `password123`.

| Espace | Identifiant | Périmètre |
|---|---|---|
| Centre des opérations | `logisticien@pia.tg` | Vue globale et administration |
| Contrôle LCT | `controleur.lct@pia.tg` | Uniquement les conteneurs affectés à LCT |
| Contrôle Togo Terminal | `controleur.togo@pia.tg` | Uniquement les conteneurs affectés à Togo Terminal |
| Réception PIA | `agent.pia@pia.tg` | Unités en route vers la PIA ou déjà réceptionnées |

> Les anciens comptes Client et Consignataire ne sont plus actifs et ne doivent plus être utilisés pour la recette.

---

## 🧰 Stack Technologique Recommandée

> **Objectif :** Choix de technologies robustes, maintenables et évolutives dans le temps.

### Frontend Mobile — App Chauffeur

| Technologie | Version | Justification |
|-------------|---------|---------------|
| **React Native (Expo)** | SDK 52+ | Framework cross-platform mature pour iOS/Android, adapté aux chauffeurs sur le terrain |
| **TypeScript** | 5.x | Typage strict, meilleure maintenabilité |
| **React Navigation** | v7 | Navigation mobile standard |
| **React Native Paper** | 5.x | Composants Material Design 3 |
| **TanStack Query** | 5.x | Cache et synchronisation serveur |
| **Axios** | 1.x | HTTP + intercepteurs JWT |
| **React Hook Form** | 7.x | Formulaires performants |
| **Zustand** | 5.x | État global léger |

### Frontend Web — App Logisticien / Contrôleur Terminal

| Technologie | Version | Justification |
|-------------|---------|---------------|
| **React** | 19.x | Bibliothèque UI standard, riche écosystème |
| **Vite** | 6.x | Build rapide, HMR performant, plus léger que Next.js pour un dashboard |
| **TypeScript** | 5.x | Typage strict partagé avec le backend |
| **React Router** | 7.x | Routing côté client |
| **TanStack Query** | 5.x | Cache serveur |
| **Axios** | 1.x | HTTP + intercepteurs JWT |
| **Tailwind CSS** | 4.x | Styling rapide et cohérent pour dashboards |
| **Recharts** | 2.x | Graphiques pour les tableaux de bord |
| **React Hook Form** | 7.x | Formulaires |
| **Zustand** | 5.x | État global |

### Backend & API

| Technologie | Version | Justification |
|-------------|---------|---------------|
| **Node.js** | 22+ | Runtime JavaScript côté serveur, vaste écosystème |
| **Express.js** | 5.x | Framework HTTP minimaliste et flexible |
| **TypeScript** | 7.x backend | Cohérence frontend/backend, typage strict |
| **Prisma ORM** | 7.x | ORM moderne avec adaptateur PostgreSQL et génération de types |
| **PostgreSQL** | Prisma Postgres | Base de données relationnelle actuellement utilisée par le projet |
| **JWT (jsonwebtoken)** | 9.x | Authentification sans état, standard d'industrie |
| **bcrypt** | 6.x | Hachage de mots de passe sécurisé |
| **Zod** | 4.x | Validation de schémas côté serveur avec inférence TypeScript |
| **Socket.IO** | 4.x | Notifications temps réel (push), suivi en direct des conteneurs |
| **Winston** | 3.x | Journalisation structurée des événements et erreurs |

### DevOps & Qualité

| Technologie | Version | Justification |
|-------------|---------|---------------|
| **Git + GitHub** | — | Contrôle de version, collaboration, CI/CD |
| **ESLint + Prettier** | Dernière | Qualité de code, formatage automatique |
| **Jest + React Native Testing Library** | Dernière | Tests unitaires et d'intégration |
| **Expo EAS Build** | — | Build et déploiement iOS/Android automatisés |
| **Docker** | — | Conteneurisation du backend, environnement reproductible |
| **GitHub Actions** | — | Intégration et déploiement continus (CI/CD) |

---

## ✅ Plan de Réalisation — Checklist

> **Archive de réalisation :** les mentions Client, Consignataire et anciens statuts ci-dessous décrivent les versions antérieures. Elles ne définissent plus le produit actif ; la référence v3.1 en tête de document prévaut.

### Phase 0 : 🏗️ Fondations du Projet ✅ Terminée

- [x] **Initialiser le projet Expo avec TypeScript**
  - [x] Créer le projet avec `npx create-expo-app`
  - [x] Configurer TypeScript strict
  - [x] Mettre en place ESLint et Prettier
  - [x] Initialiser le dépôt Git
- [x] **Configurer le backend (Node.js + Express + TypeScript)**
  - [x] Initialiser le projet avec `npm init`
  - [x] Configurer TypeScript pour le backend
  - [x] Mettre en place Prisma ORM avec Prisma Postgres
  - [x] Créer le schéma de base de données initial (8 modèles)
  - [x] Configurer et exécuter les migrations Prisma
  - [x] Créer et exécuter le seed (données de test)
  - [x] Configurer le client Prisma avec adaptateur PrismaPg
  - [x] Script de vérification ✅ Connected
- [x] **Mettre en place l'authentification**
  - [x] Implémenter le modèle User avec les six rôles métier
  - [x] Configurer bcrypt pour le hachage des mots de passe
  - [x] Implémenter la génération et la validation des tokens JWT
  - [x] Créer les endpoints d'inscription et de connexion
  - [x] Protéger les routes API avec middleware d'authentification
  - [x] Tester le flux d'authentification complet ✅

### Phase 1 : 🔐 Gestion des Utilisateurs ✅ Terminée

- [x] **Service API**
  - [x] Créer le service Axios avec intercepteurs JWT
  - [x] Interfaces TypeScript (LoginRequest, RegisterRequest, User, AuthResponse)
  - [x] Gestion du refresh token et file d'attente des requêtes
- [x] **Contexte d'authentification**
  - [x] Créer AuthProvider (login, register, logout)
  - [x] Persistance du token via AsyncStorage
  - [x] Hook useAuth pour les composants
  - [x] Déconnexion automatique à l'expiration du refresh token
- [x] **Écran de connexion (LoginScreen)**
  - [x] Formulaire email/mot de passe
  - [x] Gestion des erreurs et loading
  - [x] Redirection après connexion
- [x] **Écran d'inscription (RegisterScreen)**
  - [x] Formulaire complet (nom, prénom, email, téléphone, mot de passe)
  - [x] Sélection du rôle (Client/Logisticien)
  - [x] Validation des champs
  - [x] Lien retour connexion
- [x] **Navigation**
  - [x] AuthStack (Login, Register) — non connecté
  - [x] AppTab (Dashboard, Conteneurs, Profil) — connecté
  - [x] Icônes des onglets via `@expo/vector-icons`
  - [x] Navigation conditionnelle selon l'état d'authentification
  - [x] Stack Conteneurs (Liste → Détail → Formulaire)
- [x] **Écrans implémentés**
  - [x] DashboardScreen
  - [x] ConteneursScreen (liste + recherche + filtres)
  - [x] ConteneurDetailScreen (détail + timeline checkpoints)
  - [x] ConteneurFormScreen (création / édition, logisticiens)
  - [x] ProfilScreen
- [ ] **Gestion des profils (Logisticiens uniquement)**
  - [ ] CRUD des comptes utilisateurs
  - [ ] Association client ↔ conteneur via le connaissement (B/L)
  - [x] Rôles et périmètres Consignataire, LCT, Togo Terminal, PIA et Client
  - [ ] Interface CRUD de création et de modification des comptes métier

### Phase 2 : 📦 Traçabilité des Conteneurs 🚧 En cours

- [x] **Modèle de données Conteneur**
  - [x] Modèles Prisma Conteneur, Checkpoint, Mouvement
  - [x] Champs : B/L, consignataire, client, destination, type marchandise, date arrivée
  - [x] Affectation persistante du terminal LCT ou Togo Terminal
  - [x] Statuts complets (EN_ATTENTE, CHEZ_CONSIGNATAIRE, EN_TRANSIT_VERS_TERMINAL, AU_TERMINAL, DECHARGE_SOUS_PALAN, EN_TRANSIT_VERS_PIA, ARRIVE_PIA, STOCKE_PIA, DOUANE, LIVRE)
- [x] **Enregistrement des conteneurs**
  - [x] Routes CRUD backend `/api/conteneurs`
  - [x] Formulaire frontend avec validation
  - [x] Attribution du consignataire
  - [x] Modification et suppression (Logisticiens)
  - [x] Filtrage par statut et recherche
- [x] **Système de Checkpoints**
  - [x] Route `/api/conteneurs/:id/checkpoints`
  - [x] Types : CONSIGNATAIRE, TERMINAL_LCT, TERMINAL_TOGO, PIA
  - [x] Mise à jour automatique du statut du conteneur
  - [x] Checkpoint autorisé selon le rôle connecté
  - [x] Refus serveur des accès croisés LCT / Togo Terminal
- [x] **Historique des mouvements**
  - [x] Journalisation automatique à chaque checkpoint
  - [x] Timeline affichée dans l'écran détail
- [x] **Application web logisticien / contrôleur terminal** (`web/`)
  - [x] Initialisation Vite + React 19 + TypeScript 5
  - [x] Tailwind CSS 4 + variables de couleur PIA
  - [x] TanStack Query + React Router v7
  - [x] AuthContext web (JWT, refresh token, auto-logout)
  - [x] Service API Axios avec proxy Vite `/api` → backend
  - [x] Page Login (`/login`)
  - [x] Layout avec navigation responsive
  - [x] Dashboard logisticien (stats, derniers checkpoints, conteneurs récents)
  - [x] Page Conteneurs (liste, filtres par statut, recherche, suppression)
  - [x] Page Détail Conteneur (timeline + formulaire d'ajout de checkpoint)
  - [x] Page Formulaire Conteneur (création / édition)
  - [x] Page Checkpoints (postes de contrôle et file opérationnelle)
  - [x] Page Rapports & performance (KPI, distribution, exports rapides)
  - [x] Design system Togo Port / PIA Trace appliqué aux vues web de référence
  - [x] Nouveau cockpit PAL : identité bleu/jaune, logo compact, PIA-TRACE visible et données métier issues des API
  - [x] Dashboard aligné sur le cahier des charges : Consignataire, LCT/Togo Terminal, PIA, anomalies et journal des responsables
  - [x] Anomalies calculées uniquement après dépassement d’un seuil : attente 24 h, terminal 12 h, sous palan 2 h, douane 48 h
  - [x] Jeu de démonstration stabilisé à 17 anomalies cohérentes et 48 mouvements reliés au bon statut
  - [x] Espaces opérationnels dédiés Consignataire, LCT, Togo Terminal et PIA
  - [x] Navigation, file de travail et actions adaptées à chaque rôle
  - [x] Comptes de recette avec mot de passe commun et données réparties sur les deux terminaux
- [ ] **Prochaines sous-tâches**
  - [x] Installation des dépendances web et test en mode dev
  - [x] Interface de création de checkpoint depuis le mobile avec choix LCT ou Togo Terminal
  - [x] Notifications applicatives web et synchronisation temps réel
  - [x] Première suite automatisée de tests API et tests métier

### Phase 3 : 📊 Tableaux de Bord & Interface

- [ ] **Dashboard Logisticien**
  - [ ] Liste des conteneurs avec filtres (consignataire, statut, destination, date)
  - [ ] Graphiques : nombre de conteneurs par checkpoint
  - [ ] Graphiques : délais moyens de transit
  - [ ] Boutons d'action (enregistrer statut, générer rapport)
  - [x] Notifications en temps réel (Socket.IO) pour les anomalies et changements de checkpoint
- [ ] **Dashboard Client**
  - [x] Liste des conteneurs associés au compte client
  - [x] Statut actuel de chaque conteneur
  - [x] Historique des mouvements (lecture seule, recherche et filtres)
- [x] **Dashboards des acteurs du corridor**
  - [x] Consignataire : enregistrement, réception et départ vers le terminal
  - [x] LCT : file LCT et checkpoint terminal imposé
  - [x] Togo Terminal : file dédiée et checkpoint terminal imposé
  - [x] PIA : arrivées, stockage, douane et livraison
- [ ] **Interface de gestion des conteneurs**
  - [x] Formulaire d'ajout/modification avec validation
  - [x] Sélecteur de consignataire et destination, terminal choisi lors du checkpoint
  - [ ] Confirmation avant soumission

### Phase 4 : 📈 Rapports & Statistiques

- [ ] **Génération de rapports**
  - [ ] Rapport de flux : entrées/sorties par période
  - [ ] Rapport de délais : temps moyen par checkpoint
  - [ ] Rapport d'anomalies : conteneurs en retard, manquants
  - [x] Export CSV de l'état courant
  - [ ] Export PDF des rapports
- [ ] **Statistiques avancées**
  - [x] Tableau de bord analytique avec indicateurs clés (KPI)
  - [ ] Volume traité par consignataire
  - [ ] Taux de conteneurs sous palan vs standard

### Phase 5 : 🔔 Notifications & Temps Réel ✅ Web terminé

- [x] **Notifications applicatives web**
  - [x] Alerte pour conteneur en retard à un checkpoint
  - [x] Notification d'arrivée à la PIA
  - [x] Notification d'anomalie
  - [x] Centre de notifications, compteur non lu et marquage comme lu
- [x] **Mise à jour temps réel**
  - [x] Rafraîchissement automatique des statuts via Socket.IO
  - [x] Actualisation directe des conteneurs, checkpoints, mouvements et anomalies
- [ ] **Notifications natives mobile**
  - [ ] Push Expo lorsque l'application est fermée

### Phase 6 : 🧪 Tests & Qualité

- [ ] **Tests unitaires**
  - [ ] Tests des modèles et schémas de validation
  - [x] Tests du service métier de détection des anomalies
  - [x] Tests initiaux des endpoints API (santé et protection JWT)
- [ ] **Tests d'intégration**
  - [x] Vérification manuelle des connexions et périmètres des six rôles
  - [x] Tests automatisés de séparation Consignataire / LCT / Togo / PIA
  - [x] Refus 403 vérifié pour le détail et le checkpoint d'un terminal opposé
  - [x] Test automatisé avec écritures du flux complet : consignataire → Togo Terminal → PIA → livraison
  - [x] Nettoyage transactionnel des données temporaires après la recette
- [ ] **Tests d'acceptance (UAT)**
  - [ ] Scénarios validés par les utilisateurs métier
  - [ ] Feedback et corrections

### Phase 7 : 🚀 Déploiement & Documentation

- [ ] **Déploiement backend**
  - [ ] Conteneurisation avec Docker
  - [ ] Configuration CI/CD avec GitHub Actions
  - [ ] Déploiement sur serveur de production (AWS/VPS)
- [ ] **Déploiement mobile**
  - [ ] Configuration EAS Build pour iOS et Android
  - [ ] Soumission à l'App Store et Google Play Store
- [ ] **Documentation**
  - [ ] Documentation technique (architecture, API, base de données)
  - [ ] Guide utilisateur Logisticien
  - [ ] Guide utilisateur Client
  - [ ] Procédure de maintenance et mise à jour

---

## 🗓️ Jalons & Échéancier

| Jalon | Description | Durée estimée |
|-------|-------------|---------------|
| **M0** | Fondations du projet (init, config, base de données) | 1 semaine |
| **M1** | Authentification et gestion des utilisateurs | 1 semaine |
| **M2** | Module de traçabilité (CRUD + checkpoints) | 2 semaines |
| **M3** | Tableaux de bord et interfaces utilisateur | 2 semaines |
| **M4** | Rapports et statistiques | 1 semaine |
| **M5** | Notifications et temps réel | 1 semaine |
| **M6** | Tests et validation | 1 semaine |
| **M7** | Déploiement et documentation | 1 semaine |
| **Total** | **-** | **~10 semaines** |

---

## 📝 Journal des Mises à Jour

> Ce journal permet de suivre l'évolution du projet dans le temps.

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| 2026-08-12 | v3.0 | Agent PIA | Nouvelle orientation : import manifeste Excel, ATP/conteneur/B/L, Vue à quai, sorties LCT/Togo Terminal, entrées-sorties PIA, calcul du séjour et statistiques par période |
| 2026-08-11 | v2.3 | Agent PIA | Séparation complète de l’espace Client : accueil dédié, navigation limitée, suivi en lecture seule, redirection par rôle et protection des pages réservées aux logisticiens |
| 2026-08-10 | v2.2 | Agent PIA | Centre de notifications web, compteur non lu, diffusion Socket.IO, actualisation automatique des opérations, notifications Prisma, tests API initiaux, création de checkpoint mobile et stabilisation durable des 17 anomalies de démonstration |
| 2026-08-10 | v2.1 | Agent PIA | Routage terminal corrigé : affectation automatique LCT ou Togo Terminal, chronologie synchronisée avec le checkpoint réel et prévention des parcours mélangeant les deux terminaux |
| 2026-08-10 | v2.0 | Agent PIA | Généralisation du cockpit PAL à toute l’application web : conteneurs, checkpoints, mouvements, anomalies, rapports, détail, formulaires, connexion, utilisateurs et paramètres ; icônes Phosphor unifiées et vues alimentées par Prisma |
| 2026-08-10 | v1.9 | Agent PIA | Refonte du moteur d’anomalies : seuils par étape, détection au franchissement, 17 exceptions de démonstration stables, cohérence checkpoint/statut et tests unitaires |
| 2026-08-10 | v1.8 | Agent PIA | Optimisation du cockpit pour les écrans larges et peu hauts : carte adaptative, tableau visible dès le premier écran, erreur API non bloquante, reprise automatique des requêtes et renouvellement automatique du jeton d'accès |
| 2026-08-10 | v1.7 | Agent PIA | Correction de fidélité du cockpit : proportions de la maquette validée, carte du corridor de Lomé, exceptions à droite et tableau sous la carte |
| 2026-08-10 | v1.6 | Agent PIA | Nouveau shell PAL et vue d'ensemble opérationnelle alimentée par Prisma, sans indicateurs fictifs, alignée sur le cahier des charges |
| 2026-08-08 | v1.5 | Agent PIA | Pages Mouvements et Anomalies opérationnelles : API Prisma, filtres, priorisation, journal métier et données de démonstration supprimables |
| 2026-08-01 | v1.4 | Agent PIA | Refonte de l'interface web selon les maquettes : shell Togo Port, vue d'ensemble, conteneurs, détail, checkpoints et rapports |
| 2026-08-01 | v1.3 | Agent PIA | Création de l'application web logisticien/contrôleur (`web/`) : Login, Dashboard, Conteneurs, Détail, Formulaire |
| 2026-08-01 | v1.2 | Agent PIA | Phase 2 — Traçabilité : CRUD conteneurs, checkpoints, mouvements, connexion API frontend |
| 2026-08-01 | v1.1 | Agent PIA | Finalisation Phase 1 (refresh token, icônes, écrans), ajout des écrans Détail et Formulaire conteneur |
| | v1.0 | | Initialisation du plan de projet |
| | | | |
| | | | |

---

## 📌 Diagramme de l'Architecture (Aperçu)

```
┌─────────────────────────┐     ┌─────────────────────────┐
│    App Mobile Chauffeur  │     │    App Web Logisticien   │
│   React Native (Expo)   │     │   React + Vite + TS     │
│  ┌───────────────────┐  │     │  ┌───────────────────┐  │
│  │  Auth / Checkpoints│  │     │  │ Auth / Dashboard  │  │
│  │  Suivi en route    │  │     │  │ Gestion / Contrôle │  │
│  └───────────────────┘  │     │  └───────────────────┘  │
└──────────┬──────────────┘     └──────────┬──────────────┘
           │                                │
           │      TanStack Query + Axios    │
           └──────────────┬─────────────────┘
                          │ HTTPS / WebSocket
           ┌──────────────▼─────────────────┐
           │      Backend API (Node.js)     │
           │  Express + TypeScript + Prisma │
           └──────────────┬─────────────────┘
                          │
           ┌──────────────▼─────────────────┐
           │      Base de Données           │
           │         PostgreSQL             │
           │ Users, Conteneurs, Checkpoints │
           │ Mouvements, Consignataires...  │
           └────────────────────────────────┘
```

---

## 🔄 Mises à Jour & Durabilité dans le Temps

### Stratégie de Maintenance

1. **Mises à jour des dépendances** : Vérifier et mettre à jour les packages chaque mois (`npm outdated` → `npm update`).
2. **Sécurité** : Scanner les vulnérabilités avec `npm audit` régulièrement.
3. **Compatibilité Expo** : Suivre les mises à jour Expo SDK (généralement 2-3 versions majeures par an).
4. **Sauvegardes BDD** : Script de backup automatique de MySQL chaque semaine.
5. **Monitoring** : Mettre en place des alertes de performance et d'erreurs (ex: Sentry).

### Évolutions Futures Possibles

- [ ] Ajout d'une interface web (React.js) pour les logisticiens
- [ ] Intégration API douane pour automatiser les formalités
- [ ] Module de facturation automatique par conteneur
- [ ] Application iOS/Android native (Swift/Kotlin) pour des performances accrues
- [ ] QR Code / RFID sur les conteneurs pour un scan rapide aux checkpoints
- [ ] Dashboard temps réel avec cartographie (Mapbox/Google Maps)

---

## 🖼️ Maquettes d'Écrans — App Mobile Chauffeur

Les 7 maquettes dans [frontend/assets/ecran/](frontend/assets/ecran/) correspondent à l'**application mobile des chauffeurs** :

1. [ecran(1).png](frontend/assets/ecran/ecran(1).png)
2. [ecran(2).png](frontend/assets/ecran/ecran(2).png)
3. [ecran(3).png](frontend/assets/ecran/ecran(3).png)
4. [ecran(4).png](frontend/assets/ecran/ecran(4).png)
5. [ecran(5).png](frontend/assets/ecran/ecran(5).png)
6. [ecran(6).png](frontend/assets/ecran/ecran(6).png)
7. [ecran(7).png](frontend/assets/ecran/ecran(7).png)

> **Action :** Implémenter ces écrans dans le projet Expo React Native (`frontend/`). Ils sont destinés aux chauffeurs pour le suivi en route.

## 🖥️ Application Web — Logisticiens & Contrôleurs de Terminal

L'application web (`web/`) est destinée aux :
- **Logisticiens** : gestion complète des conteneurs, utilisateurs, rapports.
- **Contrôleurs LCT / Togo Terminal** : validation des arrivées, départs, déchargements sous palan.
- **Clients** (optionnel) : suivi web des conteneurs associés.

Elle offre une vue d'ensemble plus grande, des tableaux de bord analytiques et une saisie plus confortable sur ordinateur.

---

> **Note :** Cochez les cases `[ ]` au fur et à mesure de l'avancement des tâches. Remplacez `[ ]` par `[x]` une fois la tâche terminée.

---

*Document mis à jour le — 18/08/2026*

### Transmission terminal → PIA — 18/08/2026

- Une sortie validée par LCT ou Togo Terminal place le conteneur au statut métier `SORTI_TERMINAL`.
- Tous les agents PIA reçoivent une notification liée au conteneur.
- La notification contient désormais les trois références opérationnelles disponibles : numéro de conteneur, B/L et ATP.
- Le registre PIA distingue les conteneurs programmés par manifeste de ceux réellement en route, affichés comme « Attendu à la PIA ».
- Le registre PIA peut être recherché par numéro de conteneur, B/L ou ATP.
- Le registre PIA propose trois vues sur la même page : attendus, entrés/en séjour et sortis. Chaque vue affiche son compteur et trie les opérations les plus récentes en premier.
- Les données PIA sont rafraîchies en temps réel après une validation de sortie terminal.
- Le tableau de réception PIA trie les sorties terminal selon l’heure réelle de validation : la dernière validation LCT/Togo apparaît immédiatement en première ligne.
- La recette automatisée couvre maintenant : manifeste → sortie terminal → visibilité et notification PIA → entrée PIA → sortie PIA.
- Nettoyage du 18/08/2026 : 875 conteneurs `isDemo` ayant des événements opérationnels futurs ont été supprimés avec 11 checkpoints, 11 mouvements et 12 notifications associés.
- Le générateur de démonstration conserve les prévisions futures, mais recale désormais tous les événements réalisés afin qu’ils ne dépassent jamais la date courante.
- Réinitialisation complète du 18/08/2026 : toutes les anciennes données `isDemo` ont été remplacées par 3 284 conteneurs de démonstration cohérents. Le contrôle final confirme zéro événement opérationnel après le 18/08/2026.

### Registre chronologique temps réel — 21/08/2026

- Le tableau des conteneurs affiche désormais la date de sortie du terminal, la date d'entrée à la PIA et la date de sortie de la PIA.
- La dernière étape validée est mise en évidence en jaune pour être identifiée immédiatement.
- Toutes les files LCT, Togo Terminal, PIA et Logisticien sont triées selon la dernière action enregistrée, puis rafraîchies automatiquement par Socket.IO.
- L'export CSV reprend également les trois dates opérationnelles.
- La recette automatisée vérifie qu'après chaque sortie terminal, entrée PIA ou sortie PIA, le conteneur traité remonte en première ligne avec la date correspondante.
- La connexion Socket.IO utilise directement l'API locale en développement afin d'éviter les erreurs `EPIPE` du proxy WebSocket de Vite lors des redémarrages du backend.
