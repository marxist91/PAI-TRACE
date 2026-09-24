# Vues PIA et terminaux

- `/sejours` : stock PIA actuel, indépendant de toute période historique, avec filtre
  de terminal, niveaux d’alerte et export existant. Accès PIA, logisticien et admin.
- Le compteur « En séjour » et le menu PIA ouvrent cette page. Le bouton
  « Enregistrer la sortie » ouvre la fiche avec le poste PIA et la sortie sélectionnés.
  Aucune écriture à l’ouverture : destination et validation restent obligatoires.
  Après succès, retour à la liste et invalidation du cache des opérations.
- `/file-terminal` : file actuelle sans sortie terminal ni entrée/sortie PIA, limitée
  au périmètre serveur du compte. Premier enregistrement croissant, filtres par
  ancienneté UTC, manifeste associé et référence. Une date de comparaison passée
  ne reconstitue pas le stock historique de cette date.
- `createdAt` distingue anciens/nouveaux ; `updatedAt` et la date du manifeste ne
  servent pas à cette classification. Le rattachement au manifeste peut évoluer
  lors d’un réimport. Les anciennes lignes sans rattachement restent visibles.
- Les statistiques et exports existants deviennent accessibles aux trois rôles
  opérationnels. Pour un terminal, le sélecteur est fixé sur son propre périmètre ;
  les restrictions côté serveur demeurent inchangées.

## Vérifications du 24 septembre 2026

82 tests backend, 20 tests frontend, builds backend/web et 3 tests de budget JS réussis.
Recette PostgreSQL isolée : stock excluant les sortis, données de manifeste présentes,
isolation LCT/Togo même avec filtre contraire, statistiques PIA, sortie validée une
seule fois et disparition du stock après validation. Exécutable avec
`TEST_DATABASE_URL=... npm run test:operational-views-db` depuis `backend`, sur une base
locale de test uniquement. Aucune modification des données en service.

Contrôle navigateur sur fixtures isolées : liens du tableau de bord, stock et retour
à tous les terminaux, filtre anciens et réinitialisation, statistiques PIA/jour,
sélecteur LCT verrouillé, bouton de sortie ouvrant le formulaire attendu. Contrôle
visuel effectué sur écran de bureau ; pas de recette mobile exhaustive.

Publication : attendre la réussite du workflow GitHub, puis déployer manuellement
le commit validé sur le service Render existant. Aucune migration de schéma requise.
