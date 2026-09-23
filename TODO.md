# ✅ TODO — Projet PIA

## Recette gratuite Render + Prisma — 23/09/2026

- [x] Blueprint explicitement Free, un seul service interface/API/Socket.IO, sans ressource payante ni migration automatique.
- [x] Origine HTTPS Render, secrets JWT contrôlés, routes React rechargeables et assets servis par Express.
- [x] 74 tests backend et compilations backend/web réussis.
- [x] Guide DEPLOIEMENT_RENDER.md : quotas, données partagées, comptes de test, sauvegarde et étapes de publication.
- [ ] Publier la préparation, connecter Render et confirmer la base Prisma de recette (aucune mise en ligne effectuée).
- [ ] Sécuriser les comptes avant exposition et effectuer la recette sur l'URL publique.

## Recette de protection et automatisation — 23/09/2026

- [x] Base PostgreSQL 17 temporaire indépendante : les 12 migrations s’appliquent depuis une base vide.
- [x] 44 scénarios de protection API/base : parcours LCT/Togo, rôles, dates, concurrence et notifications.
- [x] Recette administration étendue aux pays : droits, doublons, Togo, désactivation, refus sans écriture, réactivation, historique conservé.
- [x] Nettoyage vérifié : aucun utilisateur, conteneur, checkpoint, notification ni paramètre de recette restant.
- [x] Workflow GitHub enrichi avec PostgreSQL éphémère et recettes protection/admin.
- [x] Commit 172327a publié sur main ; workflow GitHub Actions 35872495933 réussi.

## Désactivation des destinations et pilotage — 23/09/2026

- [x] Recette utilisateur confirmée : ajout d’un pays depuis les paramètres, sélection et sortie PIA réussis.
- [x] Boutons ADMIN Désactiver/Réactiver, statut visible ; catalogue et historique conservés, filtre des destinations actives côté formulaire et serveur.
- [x] Compteur Sorties PIA ajouté au pilotage pour jour/semaine/mois ; cinq indicateurs sur grand écran.
- [x] 68 tests backend et 12 tests web réussis, compilations réussies.
- [x] Recette des boutons pays et du compteur Sorties PIA confirmée par l'utilisateur.

## Pays de destination configurables — 23/09/2026

- [x] Liste persistante initiale Burkina Faso, Mali, Niger ; migration additive appliquée et relue en base.
- [x] Paramètres : présentation avec icônes et formulaire d’ajout réservé ADMIN, contrôle des doublons et des versions concurrentes.
- [x] Sortie PIA : sélection obligatoire dans la liste, validation serveur et enregistrement du libellé configuré ; Togo et destinations inconnues refusés.
- [x] Vérification navigateur avec Agent PIA : liste des trois pays chargée, aucune opération enregistrée.
- [x] 67 tests backend, 12 tests web, compilations backend/web réussies.
- [x] Recette admin confirmée par l’utilisateur : pays ajouté, proposé à la PIA et utilisé pour une sortie réussie.

## Tri de l’export sorties terminal — 23/09/2026

- [x] Trier les sorties terminal par date/heure de départ décroissante, indépendamment de la dernière mise à jour PIA.
- [x] Départ identique : numéro de conteneur puis B/L ; dates absentes en fin de liste. Autres exports et données sources inchangés.
- [x] Test de non-régression avec relecture XLSX : dates, égalités, absence de date, totaux et absence de mutation.

## Filtre terminal et reprise du chargement — 23/09/2026

- [x] Filtre Tous/LCT/Togo Terminal commun aux statistiques, au stock actuel et aux exports ; cumul avec les droits existants côté serveur.
- [x] Noms des exports et périmètre du classeur précisent le terminal sélectionné.
- [x] Boutons de nouvelle tentative indépendants pour statistiques et stock, conservant les filtres.
- [x] 63 tests backend, 12 tests web, TypeScript backend et compilation web réussis ; git diff --check sans erreur.
- [ ] Terminer la recette après reconnexion : retour à Tous, boutons Réessayer, téléchargement filtré et rendu Excel natif. Session navigateur expirée lors du dernier contrôle ; fichier téléchargé non retrouvé au chemin attendu.

## Séjours PIA par terminal d’origine — 23/09/2026

- [x] Tableau LCT/Togo Terminal : séjours mesurés, non mesurables, moyenne, médiane, minimum et maximum.
- [x] Calcul commun aux indicateurs globaux ; cohortes limitées aux sorties PIA de période, sans moyenne de moyennes ni de médianes.
- [x] Nouvelle feuille « Séjours par terminal » dans la synthèse Excel, durées numériques en heures.
- [x] 61 tests backend, 12 tests web, compilations backend/web ; relecture XLSX vérifiée.
- [ ] Rendu Excel natif à confirmer.

## Évolution quotidienne du stock PIA — 23/09/2026

- [x] Courbe du stock de fin de journée, détail journalier et alerte sur les écarts locaux.
- [x] Journée en cours bornée à l’heure du calcul ; aucun point futur ; reconstruction par dates indépendante du statut.
- [x] Synthèse Excel : stocks début/fin, écart, arrêté UTC et état de journée ajoutés aux mouvements quotidiens. Le bilan ne somme pas les stocks.
- [x] 59 tests backend, 12 tests web, compilations backend/web ; bornes à minuit, erreurs compensées et relecture XLSX vérifiées.
- [x] Navigateur : courbe semaine (2, 12, 12), détail sans écart ; courbe mensuelle vérifiée à 390 px, aucun point après le 23/09.
- [ ] Rendu des nouvelles colonnes dans Excel natif à confirmer.

## Statistiques par pays de destination — 22/09/2026

- [x] Entrées, sorties, part des sorties, couverture des durées et séjour moyen terminé par pays actuel du registre.
- [x] Pays absents regroupés en « À confirmer », variantes de casse/espaces normalisées, aucune destination déduite de la marchandise.
- [x] Onglet Destinations ajouté à la synthèse Excel, totaux et moyenne globale pondérée identiques à l’écran.
- [x] 57 tests backend, 12 tests web, compilations backend/web ; contrôle navigateur semaine/mois et tableau défilant à 390 px.
- [ ] Rendu de l’onglet Destinations dans Excel natif à confirmer.

## Clôture des parcours historiques de test — 22/09/2026

- [x] Périmètre confirmé : date Vu à quai en juillet/août 2026. 0 en juillet, 88 en août (LCT).
- [x] 53 parcours complétés, 35 déjà complets conservés ; ajout de 8 sorties terminal, 8 entrées PIA et 53 sorties PIA.
- [x] Sauvegarde privée préalable, transaction atomique, conservation des dates/destinations et contrôle des conteneurs hors périmètre.
- [x] Étapes générées annotées SIMULATION / TEST dans checkpoints/mouvements, rapport MAINTENANCE_TEST ; aucune suppression ni notification de fausse opération réelle.
- [ ] Les statistiques incluent encore ces dates synthétiques : ne pas les présenter comme performances réelles.

## Stock actuel et séjours prolongés — 22/09/2026

- [x] Bloc autonome du filtre historique, actualisé chaque minute et après les opérations.
- [x] Ancienneté, liste triée du plus ancien au plus récent, liens vers les fiches et seuils ENTRE_PIA configurés.
- [x] Filtres tous/alertes avec critiques/critiques seuls et export Excel du stock filtré avec date d’arrêté.
- [x] 55 tests backend, 12 tests web, compilations backend/web ; contrôle bureau : 45 présents et 45 critiques, seuils 72/120 h.
- [x] Export critique téléchargé et relu : 45 lignes, sans doublon, ordre décroissant des séjours.
- [ ] Contrôle mobile et rendu Excel natif.

## Répartition des séjours — 22/09/2026

- [x] Quatre tranches descriptives : [0,24 h], ]24,72 h], ]72,168 h], plus de 168 h ; aucune modification des seuils d’alerte.
- [x] Graphique des séjours terminés mesurables et quatre lignes ajoutées à la synthèse Excel ; période et exclusions identiques aux durées.
- [x] Tests aux bornes et une minute après chaque borne, total sans doublons, absence de mesures et relecture XLSX ; 52 tests backend, 12 tests web, compilations réussies.

## Durées des séjours terminés — 22/09/2026

- [x] Médiane, minimum, maximum, nombre mesuré et non mesurable dans Statistiques et Synthèse Excel.
- [x] Population limitée aux sorties PIA de la période ; durée complète depuis l’entrée, séjours en cours exclus.
- [x] Absence de durée valide : moyenne et extrêmes indisponibles, pas de faux zéro ; aucune suppression des données de test.
- [x] 51 tests backend, 12 tests web et compilations backend/web réussis ; médianes paires/impaires et bornes testées.
- [ ] Rendu du nouvel export à vérifier dans Excel.

## Délai terminal → PIA — 21/09/2026

- [x] Moyenne par terminal et globale pondérée ; cohorte des entrées PIA dans la période, départ antérieur admis.
- [x] Comptages mesurés/non mesurables ; dates manquantes ou inversées exclues, absence de mesure distincte de zéro.
- [x] Tableau Statistiques et synthèse Excel enrichis sans modifier les exports opérationnels ni la base.
- [x] 49 tests backend, 12 tests web, TypeScript backend et build web réussis.
- [x] Navigateur bureau : semaine sans entrée affiche « Non disponible » ; mois de septembre affiche 16 transferts mesurés (9 LCT, 7 Togo), zéro non mesurable.
- [ ] Contrôle visuel mobile et rendu du nouvel export dans Excel.

## Export de synthèse statistique — 21/09/2026

- [x] Bouton distinct des exports opérationnels, période sélectionnée et périmètre du rôle conservés.
- [x] Trois feuilles : Synthèse, Mouvements quotidiens, Terminaux ; stocks historique/actuel distingués, génération horodatée.
- [x] Calcul partagé avec l’API Statistiques ; 47 tests de services backend réussis, compilation backend/web validée.
- [ ] Vérification du rendu dans Excel par l’utilisateur.

## Statistiques enrichies — 21/09/2026

- [x] Stock initial/final reconstitué par dates et rapprochement stock initial + entrées − sorties ; écart explicite en cas de données incohérentes.
- [x] Graphique quotidien avec jours sans mouvement ; période en cours arrêtée à maintenant, sans jours futurs artificiellement à zéro.
- [x] Comparaison LCT/Togo : sorties terminal, entrées et sorties PIA, tableau des volumes exacts ; dates propres à chaque étape.
- [x] 45 tests de services backend et 12 tests web réussis ; TypeScript backend et build web validés.
- [x] Contrôle navigateur connecté semaine du 14/09 : 46 + 16 − 2 = 60, stock actuel distinct de 47 ; graphiques visibles, LCT 8/9/1 et Togo 7/7/1.
- [ ] Contrôle visuel mobile et intégration de ces nouveaux indicateurs dans un export statistique dédié (exports des opérations inchangés).

## Export PIA historique — 21/09/2026

- [x] Exports flux/entrées/sorties PIA : dates limitées à la période et au type choisi, libellé des opérations au lieu du statut actuel, totaux distincts.
- [x] Séjour terminé affiché seulement pour les sorties sélectionnées, durée réelle conservée même si l’entrée précède la période ; export Séjours inchangé.
- [x] Tests XLSX après sauvegarde/relecture : semaines et mois, borne de fin exclue, entrée antérieure, sortie ultérieure et absence de mutation des données sources ; compilation backend réussie.
- [ ] Régénérer l’export réel du 14 au 20 septembre pour confirmer les 16 entrées et 2 sorties ; anciens fichiers inchangés.

## Filtres des opérations et distinction VAQ — 21/09/2026

- [x] Jour/semaine/mois avec date au choix : sorties terminal et entrées/sorties PIA, indépendamment du statut actuel.
- [x] Compteur VAQ calculé sur la date de débarquement du registre, séparément de la date de sortie ; colonne Sortie terminal et message de période vide corrigés.
- [x] Registre PIA : préciser que le séjour moyen concerne tout l’historique et afficher le stock actuel.
- [x] 12 tests web et compilation réussis. Navigateur connecté : le 18/09 affiche 6 sorties LCT et 6 Togo Terminal, même après sortie PIA.
- [ ] Terminer la comparaison visuelle semaines/mois et exports, puis préparer commit/push des modifications en attente.

## Historique des étapes dans Conteneurs — 18/09/2026

- [x] Filtrer les étapes réalisées par leur date enregistrée, pas par le seul statut courant : une sortie terminal reste visible après entrée/sortie PIA.
- [x] Conserver recherche, périmètre serveur par rôle, tri et export de la liste filtrée ; préciser « toutes dates » dans la vue.
- [x] Quatre tests de filtre, dont six sorties déjà entrées à la PIA ; sept tests web réussis au total.

## Séparation Admin / Logisticien — 18/09/2026

- [x] Nouveau rôle ADMIN : tous les droits ; LOGISTICIEN conserve les opérations, sans utilisateurs ni paramètres (menus, routes web et API).
- [x] Préserver les droits administratifs des anciens LOGISTICIEN en les migrant vers ADMIN, sessions révoquées et reconnexion nécessaire. Les futures attributions LOGISTICIEN restent sans administration.
- [x] Minimum mot de passe 8 caractères ; œil afficher/masquer dans les comptes et la connexion.
- [x] Paramètres : récapitulatif avec icônes et cartes, bouton Modifier, retour au récapitulatif après sauvegarde.
- [x] Recette isolée Admin/Logisticien réussie : refus de lecture/écriture administrative et inscription pour logisticien, opérations conservées, 7 caractères refusés et 8 acceptés. 43 tests backend et compilations réussis.

## Administration des comptes et paramètres — 18/09/2026

- [x] Création/modification des comptes internes, choix du rôle, activation/désactivation et changement du mot de passe depuis Utilisateurs.
- [x] Administration réservée aux logisticiens ; inscription publique fermée ; secrets absents des réponses ; contrôle des doublons et des modifications concurrentes.
- [x] Révocation des sessions HTTP/refresh et déconnexion temps réel lors des changements sensibles ; protection contre le retrait de son propre accès administrateur et du dernier administrateur actif.
- [x] Paramètres : quatre seuils d’alerte/critique persistants, appliqués au calcul des anomalies ; validations et version pour éviter les écrasements.
- [x] Migration appliquée à la base applicative sans suppression de données. Tests administrateur sur PostgreSQL isolé, 44 scénarios parcours et 42 tests backend réussis ; compilations backend/web validées.
- [ ] Recette visuelle connectée : créer un agent, modifier son rôle puis tester l’enregistrement des seuils (navigateur de vérification non connecté).

## Tests de protection — 18/09/2026

- [x] Ajouter `backend/scripts/test-protection-db.ts` et `npm run test:protection-db` : PostgreSQL local de recette obligatoire, différent de la base applicative.
- [x] Exécuter 44 scénarios API LCT/Togo : authentification, rôles, séparation des terminaux, ordre des étapes, dates invalides/futures et doubles validations successives/simultanées.
- [x] Vérifier chaque refus sans modification du conteneur ni création d'historique ou notification ; contrôler les destinataires après chaque succès.
- [x] Nettoyer les comptes, conteneurs et événements temporaires ; aucune opération sur les données réelles.
- [x] Suite backend : 42 tests réussis ; compilation TypeScript backend réussie.
- [x] Brancher cette recette sur PostgreSQL éphémère dans le contrôle automatique GitHub (configuration locale du 23/09 ; exécution distante après publication).

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
