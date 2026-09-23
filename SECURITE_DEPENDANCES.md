# Correctifs des dépendances — 23 septembre 2026

Périmètre : serveur `backend` et interface `web` déployés sur Render. Le projet
mobile Expo historique n'est pas couvert par cet audit.

Audit initial npm : backend 9 alertes (6 high, 3 moderate), web 2 high.
Ces nombres incluent les dépendances parentes signalées par propagation.
Après corrections et réinstallation `npm ci --ignore-scripts` : zéro vulnérabilité
signalée par `npm audit` dans chacun des deux projets, dépendances de développement incluses.
Cela ne constitue pas une garantie d'absence de toute faille applicative.

## Changements

- Multer 2.4.0, qs 6.16.0 et fast-uri 3.1.8 dans le verrouillage backend.
- js-yaml et nanoid corrigés via le verrouillage web.
- Prisma CLI fixé à 7.9.1 pour rester aligné avec le client actuel ; pas de retour en v6.
- Overrides ciblés : `@prisma/config → deepmerge-ts 8.0.2`,
  `prisma → mysql2 3.24.4`, `exceljs → uuid 11.1.1`.
  ExcelJS reste en 4.4.0. Aucune commande `npm audit fix --force` exécutée.

Ces overrides remplacent des versions indirectes imposées par les bibliothèques
parentes. Ils devront être réévalués et retirés quand ces bibliothèques intégreront
elles-mêmes les versions corrigées. Ne pas simplement les supprimer pour mettre à jour.

## Compatibilité contrôlée

- Génération du client Prisma et compilation TypeScript réussies, sans migration.
- 76 tests backend réussis, dont lecture/écriture XLSX, imports XML, règles métier,
  compatibilité UUID des règles Excel étendues et upload Multer avec limite de taille.
- 13 tests web réussis et compilation Vite réussie.
- Le workflow GitHub exécute désormais `npm audit --audit-level=moderate` pour les
  deux projets : une nouvelle alerte moderate/high/critical ou un échec du registre
  interrompt le contrôle, sans modifier automatiquement les versions.
- Les recettes PostgreSQL isolées restent dans le workflow GitHub ; elles n'ont pas
  été relancées localement pour ce lot. Aucune donnée métier modifiée.

Les avertissements de paquets dépréciés et de bundle Vite volumineux ne sont pas tous
résolus par ce lot. Ils feront l'objet de mises à jour distinctes avec tests.
Correctif préparé localement : commit/push et redéploiement Render restent à effectuer.

Références des cas indirects :
- https://github.com/advisories/GHSA-ggr8-5vv4-36mx
- https://github.com/advisories/GHSA-w5hq-g745-h8pq
- https://github.com/advisories/GHSA-rgwj-5xj2-c3m3
