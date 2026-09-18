# 📋 Projet PIA — Suivi de Réalisation

### Recette de protection — 18/09/2026

La nouvelle commande backend `npm run test:protection-db` exige `TEST_DATABASE_URL`, un PostgreSQL local nommé `pia_trace_test` (ou suffixé), distinct de `DATABASE_URL`. La connexion est remplacée uniquement dans le processus de recette avant le chargement de l'application. Aucun compte réel n'est utilisé.

Exécution locale réussie : 44 scénarios via l'API et PostgreSQL pour LCT et Togo Terminal. Couverture : requête sans session, rôles externes, accès croisés, type de checkpoint interdit, entrée sans sortie terminal, sortie sans entrée PIA, dates invalides/futures/inversées, double validation successive et deux requêtes simultanées à chacune des trois étapes. Une seule opération est créée ; les destinataires des notifications sont vérifiés. Chaque refus est comparé à un instantané complet (conteneur, checkpoints, mouvements et notifications).

Les deux parcours aboutissent à SORTI_PIA avec conservation des dates. Nettoyage limité aux identifiants créés par la recette dans un bloc finally ; absence des comptes et conteneurs temporaires vérifiée. Les données de l'application n'ont pas été modifiées. Référence Prisma Client utilisée pour les requêtes et le nettoyage transactionnel.

Vérifications complémentaires : 42 tests backend réussis, `npx tsc --noEmit` réussi. Cette recette couvre les protections des checkpoints, pas un audit exhaustif de sécurité ni les connexions temps réel des navigateurs. Prochaine étape : intégrer cette recette PostgreSQL au contrôle automatique GitHub.

### Statistiques et exports ciblés PIA — 17/09/2026

Après contrôle du fichier de septembre : les 459 lignes d’activité correspondaient aux 458 vus à quai en septembre plus un débarqué en août transféré en septembre. Sur demande utilisateur, les statistiques proposent désormais les exports Entrées et sorties PIA (par défaut), Entrées PIA, Sorties PIA, Séjours PIA et Sorties des terminaux, avec la période existante. Les seules dates de quai ne sélectionnent plus de conteneur pour ces exports. Les autres pages conservent leur export dédié.

Le filtre Séjours sélectionne les entrées avant la fin de période, non sorties ou sorties à partir du début ; la durée exportée reste la durée totale entrée/sortie, ou entrée/date de génération pour un séjour ouvert (explication et horodatage dans le fichier). Le séjour Excel n’est plus tronqué à l’heure, format décimal à deux chiffres. Moyenne backend sans arrondi intermédiaire, affichée heures/minutes sur les séjours terminés pendant la période. Remplacement du libellé ambigu Attendus PIA par Destinés PIA — registre complet ; mise en avant des entrées à la place des vus à quai. Périmètres d’accès inchangés, aucune mutation de données. Compilations web/backend et tests de génération/filtrage vérifiés ; recette visuelle utilisateur restante.

### Nettoyage du registre de démonstration Togo Terminal — 17/09/2026

À la demande de l’utilisateur après import réussi du manifeste DAD00036678 : suppression ciblée des 1 640 conteneurs terminalAffecte=TOGO, isDemo=true, manifesteId=null. Suppression associée de 37 checkpoints, 37 mouvements et 47 notifications. Transaction Serializable avec sauvegarde préalable et comparaison intégrale des conteneurs hors périmètre : 52 conteneurs réels TOGO du lot 25 et 570 LCT conservés sans modification. Comptes et lots d’import conservés. Sauvegarde locale backend/backups/togo-demo-before-cleanup-1789636992348.json, exclue de Git ; restauration possible par intervention technique. Première tentative non aboutie, contrôle en lecture seule effectué avant nouvelle tentative réussie.

### Reconnaissance du code Togo Terminal — 17/09/2026

Le manifeste DAD00036678 transmis comme fichier Togo Terminal utilise manut="LFWTERM", code absent du parseur (qui ne reconnaissait que TOGO et TOGO TERMINAL). Ajout de cet alias explicite, normalisation casse/espaces, maintien du cloisonnement des postes ; aucun terminal inconnu n’est affecté automatiquement au rôle connecté. Motifs distincts pour code inconnu et poste incompatible.

Lecture seule du fichier réel : 230 conteneurs / 117 B/L ; 52 candidats pia=Y pour Togo Terminal, 178 ignorés ; 0 candidat pour LCT. Le filtrage final par destination du registre reste inchangé et pourra réduire les candidats. 37 tests réussis et compilation backend validée. Aucun import réel effectué pendant la correction.

### Expiration de transaction pendant l’import XML — 16/09/2026

Erreur réelle P2028 après 120 secondes : les créations séquentielles multipliaient les allers-retours. Lecture du registre en une requête, créations des conteneurs puis checkpoints et mouvements groupées par 500, sans supposer l’ordre de retour des identifiants. Les mises à jour des conteneurs existants restent individuelles. Transaction Serializable unique conservée, ainsi que contrôles de conflits, chronologie, terminal et destination. Référence Prisma utilisée pour les écritures groupées et l’atomicité. Erreurs Prisma traduites en messages métier sans trace interne.

Recette PostgreSQL isolée réussie : création/réimport de 406 conteneurs synthétiques en 385 ms sur base locale ; idempotence et annulation sur conflit confirmées. Cette mesure ne préjuge pas du temps sur base distante. Données de recette nettoyées, aucun import réel déclenché. Compilation backend réussie.

### Cause vérifiée dans Safari — 16/09/2026

Inspection de l’accessibilité de la page utilisateur : « Importer 406 lignes » est désactivé, tandis que le champ datetime-local affiche 16/09/2026 12:30. La condition de désactivation correspond à une valeur dateVaq vide (406 lignes, aucune mutation en cours). Le contrôle natif affichait donc une date non validée dans l’état applicatif. Remplacement par une saisie texte explicite JJ/MM/AAAA HH:mm, convertie et contrôlée en UTC. Le bouton n’est plus désactivé pour une date vide : la validation existante remonte une erreur visible avant la requête. Trois tests réussis (français, ISO, dates invalides/futures), compilation web validée. Aucun import réel lancé ; confirmation opérateur encore nécessaire.

### Bouton Importer sans retour apparent — 16/09/2026

Deux défauts identifiés par lecture du code : erreurs affichées sous le grand aperçu (hors écran), et conversion datetime-local ajoutant systématiquement :00Z, invalide si le navigateur fournit déjà les secondes. Remplacement par une conversion explicite Lomé/UTC acceptant minutes/secondes/millisecondes et contrôlant dates impossibles/futures. Progression, succès et erreur visibles au-dessus de l'aperçu, défilement vers le retour, message précis pour date invalide et délai réseau dépassé. En cas de délai dépassé, l'utilisateur est invité à vérifier l'historique avant de relancer.

Deux tests de conversion réussis et compilation web validée. Aucun import réel déclenché. Le message exact de l'échec initial n'était pas disponible ; il reste à vérifier le clic dans le navigateur de l'utilisateur et tout éventuel refus serveur.


### Règle XML révisée : pia=Y et destination — 16/09/2026

Cette décision utilisateur remplace le filtrage précédent Y/Y : pia=Y suffit ; transit est informatif. Pays final lu en priorité dans paysDestination du registre PIA visible par l'opérateur. Togo confirmé (y compris TG/TGO et variantes usuelles) exclu, pays absent ou placeholder conservé à confirmer. Les ports fin/pod ne servent pas de pays final. Quelques mentions explicites de pays dans la description sont affichées comme suggestions non confirmées, jamais injectées automatiquement dans paysDestination ; plusieurs mentions restent visibles sans choix automatique.

Le serveur recontrôle le registre à l'import. Un Togo confirmé apparu pendant la transaction bloque le lot plutôt que de laisser importer une référence devenue exclue. Interface et motifs d'exclusion actualisés. Les anciennes sections Y/Y décrivent uniquement l'historique.

Validation : 36 tests de services réussis ; compilation backend/web. Recette API sur PostgreSQL isolé : N/Y importé, réimport inchangé, pays inconnu conservé, Togo confirmé exclu, pia=N sans écriture. Le fichier réel est testé uniquement en aperçu : 1515 conteneurs dont 406 candidats pia=Y. Aucune donnée applicative réelle modifiée ; données synthétiques nettoyées. Recette visuelle restant à effectuer.


### Filtrage XML strict — 16/09/2026

Règle expressément validée : seuls les équipements d'un principal-mani avec transit=Y ET pia=Y sont retenus. Les autres combinaisons et indicateurs absents sont ignorés. XML PAL DAD CREATE accepté via Mes manifestes, avec encodage UTF-8 ou ISO-8859-1 ; XML malformé, DTD et entités externes refusés. Limite 10 Mo, aperçu 200 lignes avec éligibles en tête. Aucun lot ni opération n'est créé si zéro conteneur éligible.

Pour un fichier éligible : date VAQ réelle explicitement confirmée par l'agent (Lomé/UTC), jamais déduite de l'ETA. Les conteneurs sont créés/complétés transactionnellement avec B/L, ATP et marchandise ; les opérations existantes ne reculent pas et les contradictions bloquent le lot. Les ports fin/pod TGLFW ne deviennent pas un pays final Togo. Les destinations inconnues restent à confirmer. Les autres fonctionnalités d'import Excel sont conservées.

Validation effective : exemplaire PAL DAD00036681, MSC SAVONA, ATP00208149 = 782 B/L, 1515 conteneurs, 974 N/N, 406 N/Y, 135 Y/N, zéro Y/Y. Test API sur PostgreSQL isolé : aperçu et import vide sans écriture. XML synthétique Y/Y : import VAQ confirmé puis réimport inchangé. Nettoyage effectué. 33 tests de services réussis et compilations vérifiées ; la recette visuelle reste à faire. Aucune donnée applicative réelle modifiée. Saxes ajouté comme dépendance directe ; npm signale 9 alertes à auditer séparément.


### Recette PostgreSQL effective — 15/09/2026

Docker démarré par l'utilisateur. Création du conteneur isolé `pia-trace-recette-20260915` (PostgreSQL 17), base `pia_trace_test`, port local 60266. Schéma synchronisé uniquement dans cette base neuve, sans modification de l'environnement applicatif ni de la base LCT.

Recette `test:official-db` réussie sur PostgreSQL : réimport identique sans changement de B/L/dates/updatedAt, absence de doublons checkpoints/mouvements, rollback du lot entier lors d'un conflit tardif. Vérification SQL après nettoyage : zéro conteneur, checkpoint, mouvement, utilisateur, import et rapport. Le référentiel MNF et le schéma restent disponibles. La concurrence et la recette UI restent distinctes et non testées ici. Correction de la terminaison du script après nettoyage/déconnexion, le pool externe pg gardant initialement le processus ouvert.


### Préparation de la recette PostgreSQL — 15/09/2026

Ajout d'un script distinct `test:official-db` pour vérifier l'import/réimport et le rollback réel d'un lot contenant un conflit tardif. Garde-fous : TEST_DATABASE_URL obligatoire, PostgreSQL local, nom de base de recette explicite et distinct de DATABASE_URL. Création de données synthétiques propres à l'exécution et nettoyage ciblé, sans suppression globale. Guide ajouté au README.

La base de recette n'est pas configurée et le moteur Docker local est arrêté. Le refus de démarrage sans configuration et la compilation du script sont vérifiés ; les scénarios PostgreSQL ne sont pas encore exécutés. Aucune donnée applicative modifiée.


### Réimport sans modifications inutiles — 15/09/2026

L'import officiel compare maintenant les données avant d'écrire. Un conteneur inchangé conserve son updatedAt, son B/L et son rattachement d'import, donc ne remonte plus artificiellement dans la file. La fusion des dates ne transporte plus les autres champs de la fiche dans les données à écrire. Chaque tentative réussie conserve son lot et son rapport d'audit, avec un bilan des créations, compléments, références inchangées et opérations ajoutées affiché dans l'interface.

Quatre scénarios supplémentaires exécutent le service à partir de fichiers synthétiques avec un adaptateur transactionnel en mémoire : réimport identique, ajout d'une étape sans doublon et conservation des références absentes, conflit tardif, isolation LCT/Togo et exclusion destination Togo. Total : 28 tests de services réussis, compilations backend/web réussies. Aucune écriture en base réelle. Ces tests ne remplacent pas une recette PostgreSQL ni un test de concurrence.


### Modèle officiel confirmé par l'utilisateur — 15/09/2026

Le classeur PIA/LCT déjà fourni est le modèle officiel convenu entre PIA et Port. Cette clarification remplace l'hypothèse antérieure d'un simple historique non importable. Le B/L peut manquer ; les destinations inconnues restent à confirmer.

L'aperçu du modèle présente désormais un bouton d'import. Le lot est enregistré dans une transaction avec provenance et empreinte du fichier. Les références absentes du nouveau fichier ne sont jamais supprimées. Les dates existantes sont conservées ; une contradiction ou une chronologie fusionnée incohérente bloque tout le lot. Seules les étapes sans date existante créent un checkpoint et mouvement, sans notification de départ fictive. Une nouvelle référence sans date d'acostage ni opération reste bloquée par le champ dateArrivee obligatoire du schéma actuel (aucune date inventée).

Le manifeste plat sert désormais uniquement à enrichir B/L, ATP, destination et marchandise des références déjà inscrites. Il ne crée plus de conteneur ni ne remplace les opérations. Le module de comparaison de deux fichiers a été retiré de la page au profit de ce parcours officiel. Vue à quai distingue le registre complet destiné PIA des opérations de la période sélectionnée.

Vérification : six tests lecture/fusion réussis et compilation backend/web. Aucun import exécuté en base pendant le développement. La recette transactionnelle sur base de test, les tests de parcours historiques et les autres compteurs prévisionnels restent à adapter/vérifier.

### Rapprochement liste PIA / manifeste — 15/09/2026

Règle confirmée : la liste envoyée par la PIA définit le périmètre ; le manifeste complète uniquement les références correspondantes. Une date prévisionnelle n'est pas une condition d'appartenance. Les attendus absents du manifeste doivent rester dans le périmètre, sans opération ni date inventée.

Première étape réalisée : comparaison de deux fichiers .xlsx dans Mes manifestes, sans écriture en base. Correspondances par numéro normalisé (espaces/casse), jamais par B/L partagé. Doublons, références manquantes, exclusions et conflits de terminal signalés pour vérification. Compteurs complets, aperçu limité à 200 lignes par liste. Le suivi historique est explicitement refusé comme substitut des deux sources. Les contrôleurs restent liés à leur terminal.

Trois tests unitaires et compilations backend/web réussis. Aucun fichier réel ni donnée existante modifié. La persistance de la liste, l'application transactionnelle et le remplacement des compteurs prévisionnels restent à faire ; l'ancien import direct n'est pas encore remplacé. Recette visuelle et fichiers sources réels encore nécessaires.

> **Dernière mise à jour :** 2026-09-11
>
> **Version fonctionnelle :** 3.4 - exports Excel opérationnels
>
> **Note :** le projet comprend désormais deux fronts : l'application mobile chauffeur (`frontend/`) et l'application web logisticien/contrôleur (`web/`).
>
> **Agent PIA créé :** `.github/agents/pia-agent.agent.md`

## 🚀 Gestion des entrées et sorties de conteneurs du Port autonome de Lomé vers la PIA

### Validation des opérations — 15 septembre 2026

La saisie refuse les doublons et les événements datés dans le futur ou avant l'étape précédente. L'entrée PIA exige une sortie terminal ; la sortie PIA exige une entrée. Un contrôle de version du conteneur dans la transaction empêche deux requêtes concurrentes de valider la même version. La fiche ne propose que les opérations disponibles au poste et indique « Parcours terminé » après sortie PIA. Les erreurs métier sont affichées dans le formulaire et les statistiques sont rafraîchies après validation. Vérification : test ciblé des règles et compilation backend/web ; concurrence non testée par une recette connectée.

### Chronologie des opérations réelles — 15 septembre 2026

La fiche affiche les quatre étapes Vu à quai, sortie du terminal affecté, entrée PIA et sortie PIA depuis leurs champs de dates respectifs. Les horaires générés par décalage de minutes sont retirés, ainsi que la déduction du terminal depuis le B/L. Une étape sans date reste « Non enregistré / Date non renseignée », même si une étape suivante est renseignée. L'entrée PIA ne reprend plus par erreur le dernier checkpoint PIA qui pouvait être une sortie. Les badges et dates du bloc Entrées et sorties sont espacés, et un B/L absent est explicitement signalé.

### Contrôle documentaire hors périmètre — 14 septembre 2026

Le contrôle des documents relève d'une autre application. Le bloc indicatif « Documents et conformité » est retiré de la fiche conteneur. Il est remplacé par trois indicateurs : sortie du terminal, entrée PIA et sortie PIA. Chaque indicateur affiche Oui et la date quand l'opération est enregistrée, sinon Non (aucune opération enregistrée). Ces indicateurs suivent les dates opérationnelles après chaque validation. Aucun document n'est artificiellement marqué validé.

## Référence fonctionnelle v3.1

Le flux de référence est désormais : **manifeste Excel → Vu à quai → sortie LCT ou Togo Terminal → entrée PIA → séjour PIA → sortie vers le pays de destination**.

### Périmètre international confirmé le 14 septembre 2026

Le pays de destination Togo est exclu du suivi des transferts internationaux. Le contrôle partagé par l'aperçu et l'import rejette ces lignes avec le motif « Hors périmètre ». Cette règle porte sur le pays de destination, pas sur le terminal : les conteneurs de Togo Terminal destinés à l'extérieur restent admis. Une destination absente reste à compléter.

Le classeur réel PIA/LCT reçu contient 168 lignes de conteneurs sur trois feuilles renseignées, dont quatre portent la destination TOGO. Il n'a pas été importé. Sa lecture multi-feuilles est réalisée dans l'aperçu décrit ci-dessous ; la reprise des opérations en base reste à préparer avec le manifeste source.

### Consultation du suivi réel — 14 septembre 2026

### Reprise en base autorisée — 14 septembre 2026

À la demande explicite de l'utilisateur, les 1 644 conteneurs `isDemo=true` affectés à LCT ont été remplacés par les 164 lignes retenues du suivi réel. Les 4 destinations Togo sont exclues. 41 anciens checkpoints, 41 mouvements et 59 notifications liés à ces seules données démo ont été supprimés. Sauvegarde récupérable : `backend/backups/lct-before-replacement-1789383497561.json` (exclue de Git).

Lot historique 22 : 277 checkpoints et mouvements repris avec les dates du fichier ; 32 conteneurs sortis PIA, 46 entrés PIA sans sortie renseignée, 1 sorti LCT sans entrée PIA, 9 vus à quai et 76 sans étape datée (statut technique ATTENDU_PIA, sans date prévue inventée). Les 113 destinations inconnues restent à confirmer. B/L stocké vide, marchandise non renseignée, date d'arrivée basée sur l'acostage fourni. Le navire, la feuille, la ligne, les indicateurs source et l'empreinte du fichier sont conservés dans le rapport de reprise. Les autres conteneurs ont été comparés avant/après et sont inchangés.

L'ancien index unique B/L encore présent dans la base a été supprimé pour l'aligner sur le schéma actuel et autoriser plusieurs conteneurs sans B/L ou avec un B/L commun. Le script `backend/scripts/replace-lct-demo.ts` effectue un contrôle sans écriture par défaut, et la sauvegarde puis la transaction avec `--apply`. La consultation web du fichier demeure en lecture seule ; cette reprise ponctuelle ne remplace pas le manifeste source attendu.

La page Manifestes reconnaît maintenant le tableau de suivi PIA/LCT et affiche un aperçu en lecture seule, distinct de l'import de manifeste. La lecture couvre toutes les feuilles, détecte les en-têtes variables et ignore notes et récapitulatifs. L'aperçu reprend navire, ATP (zéros initiaux conservés), dates VAQ/sortie terminal/entrée PIA/sortie PIA, prévision, déclaration et dépotage.

Vérification sur le classeur reçu : 168 lignes, 4 destinations Togo exclues, 164 lignes restantes dont 113 destinations à confirmer. Les valeurs NON ou vides ne deviennent ni un pays ni une date. Aucun B/L ni date prévisionnelle n'est inventé. Aucun événement n'est écrit en base et le bouton d'import est absent pour ce type de suivi. Le manifeste source reste attendu pour le rapprochement et l'intégration métier.

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
| Aperçu et validation des lignes avant import définitif | Réalisé |
| Exports Excel quotidiens, hebdomadaires et mensuels selon le rôle | Réalisé |
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

### Contrôle des manifestes avant import - v3.3

- [x] Analyser le fichier Excel sans écrire en base de données
- [x] Afficher les créations, mises à jour et lignes ignorées avant confirmation
- [x] Signaler les doublons internes, terminaux incompatibles et dates illisibles
- [x] Exiger un terminal LCT ou Togo Terminal pour les imports consolidés PAL
- [x] Limiter l'aperçu visuel aux 200 premières lignes tout en contrôlant le fichier complet
- [x] Revalider intégralement le fichier au moment de l'import définitif

### Exports opérationnels - v3.4

- [x] Exporter la Vue à quai par jour, semaine ou mois
- [x] Exporter séparément les attendus, entrées et sorties PIA
- [x] Exporter l'activité agrégée depuis la page Statistiques
- [x] Appliquer automatiquement le périmètre LCT, Togo Terminal, PIA ou PAL du compte connecté
- [x] Conserver les dates comme cellules Excel triables et filtrables
- [x] Ajouter les filtres, en-têtes PAL, largeurs et volets figés dans les classeurs générés
- [x] Documenter le démarrage, la recette et les précautions de mise en production dans le README racine
- [x] Vérifier automatiquement les tests backend et la compilation web sur GitHub

### Rapprochement B/L multi-conteneurs

- Un B/L peut être répété sur plusieurs lignes si chaque ligne porte un numéro de conteneur distinct.
- Le numéro de conteneur est l'identifiant prioritaire pour créer ou mettre à jour une unité.
- Une ligne sans numéro de conteneur peut être rapprochée par B/L uniquement lorsqu'une seule unité existante porte ce B/L.
- Si plusieurs unités existantes portent le même B/L, une ligne sans numéro de conteneur est ignorée et signalée comme ambiguë dans l'aperçu.
- Un même numéro de conteneur répété dans un fichier reste considéré comme un doublon.
- Ces règles sont sécurisées techniquement mais restent à faire valider par LCT, Togo Terminal et la PIA.

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
| 2026-09-11 | v3.4 | Agent PIA | Ajout des exports Excel par rôle, sécurisation des B/L multi-conteneurs, documentation racine et contrôle qualité GitHub |
| 2026-09-11 | v3.3 | Agent PIA | Ajout du sas d'aperçu Excel sans écriture, contrôle des lignes, détection des doublons et confirmation avant import définitif |
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
## Consultation de l'historique — 15/09/2026

Vue à quai et Statistiques permettent désormais de sélectionner une date de référence et la journée, semaine (lundi–dimanche) ou mois correspondant. Le bouton « Période actuelle » revient à la période courante. Les exports de ces deux écrans utilisent les mêmes filtres et indiquent les dates exactes.

Le serveur calcule les bornes dans le calendrier de Lomé (UTC), avec une fin exclusive, et refuse les dates invalides. Les appels existants sans date continuent à utiliser la période actuelle. Le graphique PIA compare uniquement les entrées et sorties de la période ; le stock présent reste affiché séparément comme valeur actuelle, pas comme stock historique.

Validation : quatre tests calendaires réussis, compilation backend et web réussie. Aucune modification de la base. Recette visuelle et rapprochement des exports avec août 2026 encore à réaliser. Le manifeste source réel reste attendu ; aucune donnée manquante n'est inventée.
