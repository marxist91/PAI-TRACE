# PIA-TRACE

PIA-TRACE suit les conteneurs destinés aux pays de l’hinterland depuis leur manifeste jusqu’à leur sortie de la Plateforme industrielle d’Adétikopé (PIA).

Parcours métier cible : **manifeste Excel → Vu à quai → sortie LCT ou Togo Terminal → entrée PIA → séjour → sortie PIA**.

## Espaces actifs

- Logisticien PAL : supervision consolidée LCT, Togo Terminal et PIA.
- Contrôleur LCT : import et traitement des conteneurs LCT uniquement.
- Contrôleur Togo Terminal : import et traitement des conteneurs Togo Terminal uniquement.
- Agent PIA : réception, séjour et sortie des conteneurs au port sec.

Les espaces Client et Consignataire ne font plus partie du produit actif.

## Structure

- `backend/` : API Node.js, Express, Prisma Postgres, Socket.IO et traitement Excel.
- `web/` : application métier React/Vite.
- `frontend/` : application mobile Expo conservée pour l’évaluation terrain.
- `SUIVI_PROJET_PIA.md` : état fonctionnel détaillé.
- `TODO.md` : tâches terminées et travaux restant à valider.

## Démarrage local

Prérequis : Node.js, npm et une base PostgreSQL accessible.

1. Copier `backend/.env.example` vers `backend/.env`, puis renseigner `DATABASE_URL`, `JWT_SECRET` et `JWT_REFRESH_SECRET`.
2. Installer et préparer le serveur :

   ```bash
   cd backend
   npm install
   npm run db:generate
   npm run db:push
   npm run db:demo
   npm run dev
   ```

3. Dans un autre terminal, démarrer l’application web :

   ```bash
   cd web
   npm install
   npm run dev
   ```

4. Ouvrir `http://localhost:5173`.

Les comptes de démonstration et leur périmètre sont documentés dans `SUIVI_PROJET_PIA.md`.

## Vérifications

```bash
cd backend
npm test
npm run build

cd ../web
npm run build
```

Une recette complète connectée à la base est disponible avec `npm run test:workflow` dans `backend/`. Elle crée ses données de test puis les supprime à la fin.

### Recette isolée de l'import officiel PIA

`npm run test:official-db` dans `backend/` vérifie le réimport identique et l'annulation complète d'un lot en conflit sur PostgreSQL. Elle exige `TEST_DATABASE_URL` vers une base locale dédiée nommée `pia_trace_test` (ou `pia_trace_test_suffixe`), différente de la base applicative. Le schéma Prisma doit déjà y être installé. Ne pas utiliser la base LCT réelle.

La recette crée un compte et des références synthétiques, conserve leur B/L/dates lors du réimport, vérifie l'absence de doublons puis supprime uniquement ses propres enregistrements. Le référentiel MNF reste en place. En cas d'arrêt brutal du processus, les données de recette peuvent subsister dans cette base dédiée.

Validation au 15/09/2026 : recette réussie sur PostgreSQL 17 isolé dans Docker (`pia-trace-recette-20260915`, base `pia_trace_test`). Réimport identique et rollback du lot en conflit vérifiés ; aucune donnée de test restante après nettoyage (hors référentiel MNF). La concurrence et le parcours UI ne sont pas couverts. Utiliser `docker port pia-trace-recette-20260915 5432` pour retrouver le port local ; aucune variable de l'application n'a été modifiée.

## Import et export Excel

L’import accepte les fichiers `.xlsx` ou `.xls`, affiche un aperçu sans écriture puis exige une confirmation. Tant qu’un manifeste officiel PIA/GUCE n’est pas fourni, les noms de colonnes pris en charge restent documentés et adaptables dans le parseur.

Les vues à quai, registres PIA et statistiques permettent des exports `.xlsx` quotidiens, hebdomadaires ou mensuels. Le serveur applique le périmètre du compte connecté avant de générer le fichier.

## Mise en production

- Ne jamais reprendre les secrets de `backend/.env.example` tels quels.
- Servir `web/dist` derrière HTTPS et router `/api` ainsi que Socket.IO vers le serveur backend.
- Exécuter les migrations Prisma avant le démarrage de la nouvelle version.
- Ne pas lancer le générateur de démonstration sur une base de production.
- Prévoir sauvegarde, journalisation et supervision de la base avant la recette institutionnelle.
