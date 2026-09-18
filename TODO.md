# ✅ TODO — Projet PIA

## Tests de protection — 18/09/2026

- [x] Ajouter `backend/scripts/test-protection-db.ts` et `npm run test:protection-db` : PostgreSQL local de recette obligatoire, différent de la base applicative.
- [x] Exécuter 44 scénarios API LCT/Togo : authentification, rôles, séparation des terminaux, ordre des étapes, dates invalides/futures et doubles validations successives/simultanées.
- [x] Vérifier chaque refus sans modification du conteneur ni création d'historique ou notification ; contrôler les destinataires après chaque succès.
- [x] Nettoyer les comptes, conteneurs et événements temporaires ; aucune opération sur les données réelles.
- [x] Suite backend : 42 tests réussis ; compilation TypeScript backend réussie.
- [ ] Brancher cette recette sur PostgreSQL éphémère dans le contrôle automatique GitHub.

## Statistiques et exports PIA — 17/09/2026

- [x] Remplacer le compteur ambigu Attendus PIA par Destinés PIA — registre complet et Vus à quai par Entrées PIA — période dans les statistiques.
- [x] Moyenne de séjour sans arrondi intermédiaire aux heures, affichée heures/minutes sur les sorties de période.
- [x] Choix d’export : entrées et sorties PIA, entrées seules, sorties seules, séjours PIA, sorties terminaux. Aucun export statistique proposé sur les seuls vus à quai.
- [x] Séjours : présence durant la période ; durée totale jusqu’à la sortie ou à la génération de l’export. Heures décimales conservant les minutes.
- [ ] Valider visuellement les nouveaux filtres dans le navigateur et télécharger les nouveaux exports.

## Nettoyage démos Togo Terminal — 17/09/2026

- [x] Import Togo Terminal confirmé par l’utilisateur (52 conteneurs, lot 25).
- [x] Supprimer uniquement les 1 640 conteneurs TOGO isDemo=true sans manifeste, leurs 37 checkpoints, 37 mouvements et 47 notifications.
- [x] Sauvegarde locale hors Git : backend/backups/togo-demo-before-cleanup-1789636992348.json. Conservation vérifiée des 52 importés TOGO et 570 LCT.

## Manifeste Togo Terminal LFWTERM — 17/09/2026

- [x] Reconnaître manut=LFWTERM comme Togo Terminal (fichier officiel fourni par l’utilisateur).
- [x] Vérifier le fichier DAD00036678 : 230 conteneurs, 117 B/L, 52 candidats pia=Y, 178 ignorés ; aucun accepté pour le poste LCT.
- [x] 37 tests réussis et compilation backend validée ; motif explicite si code terminal inconnu.
- [ ] Recharger l’aperçu puis valider l’import côté Togo Terminal ; pays final toujours contrôlé contre le registre.

## Délai import 406 conteneurs — 16/09/2026

- [x] Lecture groupée du registre ; création groupée des conteneurs, checkpoints et mouvements, par paquets de 500 dans une seule transaction Serializable.
- [x] Messages lisibles pour expiration et conflits Prisma, sans exposer la trace interne.
- [x] Recette PostgreSQL isolée : création et réimport de 406 références, sans doublons (385 ms localement), rollback sur conflit ; données de test nettoyées.
- [ ] Refaire l’import utilisateur pour confirmer la durée sur la base applicative distante.

## Blocage Safari confirmé — 16/09/2026

- [x] Inspection de la page réelle : bouton « Importer 406 lignes » désactivé malgré une date affichée par le contrôle natif.
- [x] Remplacer le contrôle datetime-local par une saisie explicite JJ/MM/AAAA HH:mm ; clic autorisé même si date vide, avec validation et erreur avant tout envoi.
- [x] Trois tests de conversion réussis et compilation web validée.
- [ ] Confirmer l’import réel avec l’opérateur ; aucune écriture d’import réalisée pendant ce diagnostic.

## Retour visible du bouton Importer — 16/09/2026

- [x] Afficher progression, erreur et succès au-dessus de l'aperçu, au lieu de sous les 200 lignes.
- [x] Accepter la date du navigateur avec ou sans secondes ; valider date réelle et absence de futur avant envoi.
- [x] Tests de conversion (2 scénarios) et compilation web réussis.
- [ ] Vérifier le clic de l'utilisateur et le message obtenu ; aucun import réel relancé pendant ce correctif.


## Règle XML révisée — 16/09/2026 (remplace Y/Y)

- [x] Retenir pia=Y indépendamment de transit.
- [x] Vérifier le pays final du registre PIA à l'aperçu et à l'import ; exclure Togo confirmé.
- [x] Conserver les pays inconnus « À confirmer » ; afficher les mentions de pays de la description uniquement comme suggestions non enregistrées.
- [x] Vérifier le fichier réel : 406 candidats sur 1515 ; 36 tests de services, recette API/PostgreSQL et compilations réussis.
- [ ] Recette visuelle et confirmation des destinations inconnues par les opérateurs.


## Manifeste XML PAL — 16/09/2026

- [x] Lire UTF-8/ISO-8859-1 et retenir strictement transit=Y ET pia=Y sur principal-mani.
- [x] Extraire tous les équipements d'un B/L ; conserver B/L, ATP, navire, terminal et marchandise ; ne pas confondre port Lomé et pays final.
- [x] Aperçu XML avec compteurs, motifs d'exclusion et bouton de changement de fichier ; zéro éligible = aucune écriture, même par appel direct à l'import.
- [x] Confirmer une date réelle VAQ pour les lignes retenues, sans utiliser ETA ou date de notification ; import transactionnel et contrôles de réimport.
- [x] Tests unitaires (33 au total), compilations et recette API/PostgreSQL : exemplaire réel 1515/0, XML synthétique Y/Y accepté et réimport sans doublon.
- [ ] Recette visuelle de la page avec l'utilisateur.
- [ ] Examiner les 9 alertes de dépendances signalées par npm (3 modérées, 6 élevées), sans mise à niveau automatique forcée.


## Recette PostgreSQL réalisée — 15/09/2026

- [x] Créer PostgreSQL 17 isolé dans Docker et installer le schéma de recette.
- [x] Vérifier réellement : réimport identique, B/L/dates/updatedAt conservés, absence de doublons, rollback d'un lot en conflit.
- [x] Vérifier après nettoyage : zéro conteneur, checkpoint, mouvement, utilisateur, import et rapport de recette.
- [ ] Tester les accès concurrents et le parcours complet via l'interface (non couverts par cette recette du service).


## Recette PostgreSQL isolée — 15/09/2026

- [x] Préparer `npm run test:official-db` : base locale dédiée obligatoire, distincte de DATABASE_URL, nettoyage limité aux références de cette exécution.
- [x] Compiler le script et vérifier le refus de démarrage sans TEST_DATABASE_URL.
- [ ] Démarrer PostgreSQL de recette, installer le schéma et exécuter la recette réelle. Docker est arrêté, TEST_DATABASE_URL absent.


## Vérification des réimports — 15/09/2026

- [x] Ne pas mettre à jour les conteneurs inchangés (préserver updatedAt, B/L et provenance).
- [x] Afficher un bilan : créés, complétés, inchangés et opérations ajoutées.
- [x] Tester le service complet avec fichiers synthétiques et transaction simulée : réimport identique, complément, conflit et périmètre terminal.
- [ ] Valider ces scénarios sur une base PostgreSQL de recette ; les simulations ne vérifient pas le moteur ni les accès concurrents.


## Modèle officiel PIA/Port confirmé — 15/09/2026

- [x] Accepter le fichier de suivi fourni comme liste officielle importable, sans B/L obligatoire.
- [x] Import transactionnel : compléter les dates manquantes, conserver les opérations, bloquer les conflits, ne supprimer aucune référence absente.
- [x] Limiter le manifeste plat à l'enrichissement des conteneurs déjà présents, sans création hors registre ni remplacement des opérations.
- [x] Vue à quai : afficher le total « Destinés PIA — registre complet » sans dépendre d'une date prévisionnelle.
- [x] Tester les fusions de dates, conflits et dates futures ; compiler backend/web.
- [ ] Recette en base : réimporter le modèle officiel et vérifier l'absence de nouveaux checkpoints sur un import identique.
- [ ] Adapter les anciens tests de parcours qui créaient leurs conteneurs directement depuis un manifeste plat.
- [ ] Harmoniser les autres compteurs prévisionnels et libellés avec le registre officiel.

## Périmètre défini par la liste PIA — 15/09/2026

- [x] Ajouter dans Mes manifestes une comparaison en lecture seule entre liste PIA et manifeste, par numéro de conteneur.
- [x] Signaler les correspondances, absents, hors liste, doublons et terminaux incompatibles ; trois tests unitaires réussis.
- [ ] Persister la liste PIA avec sa provenance, indépendamment des dates prévisionnelles.
- [ ] Remplacer l'import direct par l'application du rapprochement, préserver les opérations existantes et conserver les attendus absents du manifeste.
- [ ] Recalculer les indicateurs depuis le périmètre PIA et distinguer destinés, en route et réceptionnés.
- [ ] Tester avec la liste PIA et le manifeste réels (format actuellement accepté : première feuille, en-têtes ligne 1).

## Nouvelle directive PIA-TRACE - v3.4 (2026-09-11)

- [x] Bloquer les validations répétées, les dates futures et les étapes inversées ; masquer les actions déjà réalisées sur la fiche (15/09/2026)

- [x] Aligner la chronologie sur les quatre dates réelles ; supprimer les horaires fictifs et l'affectation terminal calculée depuis le B/L (15/09/2026)

- [x] Retirer le contrôle documentaire de la fiche conteneur ; afficher uniquement sortie terminal, entrée PIA et sortie PIA en Oui/Non avec date (14/09/2026)

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
- [x] Exclure de l'import les lignes dont le pays de destination est le Togo, avec motif visible dans l'aperçu
- [ ] Adapter l'import au classeur réel PIA/LCT : feuilles multiples, en-têtes décalés, ATP par navire et dates des opérations
- [x] Ajouter la consultation du suivi réel PIA/LCT en lecture seule, indépendante du manifeste source
- [x] Vérifier 168 lignes détectées, 4 destinations Togo exclues et 113 destinations à confirmer sur le fichier reçu
- [x] Remplacer sur demande les 1 644 conteneurs démo LCT par 164 lignes réelles, sauvegarder les anciennes données et reprendre 277 étapes historiques (14/09/2026)
- [x] Ajouter l'aperçu et la validation des lignes avant l'import définitif
- [x] Ajouter un export Excel des listes quotidiennes et mensuelles
- [x] Définir les règles techniques provisoires de rapprochement en cas de B/L multi-conteneurs
- [ ] Faire valider les règles B/L multi-conteneurs par les équipes métier
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
- [ ] Phase 6 : 🧪 Tests & Qualité (démarrée : 12 tests automatisés passent)
- [x] Vérifier manuellement les six connexions et l'interface de chaque rôle
- [x] Vérifier les refus d'accès croisés LCT / Togo Terminal
- [x] Automatiser un scénario d'écriture complet Consignataire → Togo Terminal → PIA → Livraison
- [x] Nettoyer automatiquement le conteneur, les mouvements, checkpoints et notifications de recette
- [ ] Phase 7 : 🚀 Déploiement & Documentation
- [x] Ajouter un guide racine de démarrage, recette et mise en production
- [x] Ajouter le contrôle GitHub automatique des tests backend et de la compilation web
- [ ] Choisir l’hébergement de production, le domaine et la stratégie de sauvegarde
# Historique opérationnel — 15/09/2026

- [x] Choisir une date passée et une période jour/semaine/mois dans Vue à quai et Statistiques.
- [x] Appliquer la même période aux exports Excel de ces deux écrans.
- [x] Distinguer les flux historiques du stock actuellement présent à la PIA.
- [x] Tester les limites calendaires et le refus des dates impossibles (4 tests).
- [ ] Recette visuelle : sélectionner août 2026 dans Vue à quai et Statistiques et vérifier l'export avec les données LCT réelles.
