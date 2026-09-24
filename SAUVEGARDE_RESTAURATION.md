# Sauvegarde locale PIA-TRACE

## Première vérification — 24 septembre 2026

Une archive du schéma `public` a été créée depuis la base configurée localement,
puis restaurée dans un nouveau PostgreSQL 17 Docker sans réseau ni port publié.
Les 11 tables, leurs effectifs et leurs empreintes de contenu correspondent au
même snapshot source. La copie Docker de test et son volume ont été supprimés.
La base source a uniquement été lue. Aucune restauration sur la base en service.

Dossier local privé (ignoré par Git) :
`backend/backups/2026-09-24T08-55-01-046Z-56d09db3/`

- `database.dump` : archive PostgreSQL custom, 274 762 octets.
- `sha256.txt` : empreinte d'intégrité de l'archive.
- `verification.json` : date, périmètre et contrôles par table, sans lignes métier.

Cette connexion locale est la source sauvegardée ; ne pas supposer qu'une future
modification de DATABASE_URL Render sera automatiquement répercutée localement.

## Refaire une sauvegarde ET son test de restauration

Depuis `backend`, exécuter `npm run db:backup:verify`.
Pré requis : Docker démarré, image officielle `postgres:17-alpine` déjà présente,
source PostgreSQL 17 et connexion TCP directe via `DIRECT_DATABASE_URL` (prioritaire)
ou `DATABASE_URL` dans l'environnement privé. Aucun secret dans une commande ou Git.
Les paramètres TLS personnalisés non pris en charge sont refusés, pas ignorés.

Le script utilise pg_dump et un snapshot partagé avec la lecture des empreintes,
suivant le guide Prisma Postgres. Il crée un nouveau dossier à chaque exécution
(0700, fichiers 0600), sans écraser une archive. Il n'accepte aucune URL de destination
et restaure uniquement dans son propre conteneur jetable. Il n'effectue aucun nettoyage
des anciennes archives. Une archive `.partial` ou sans rapport de vérification n'est
pas une sauvegarde validée. Ne pas la présenter comme récupérable sans test.

## Protection et limites

L'archive est **non chiffrée**, malgré les permissions restrictives. Elle contient
notamment les comptes, mots de passe hachés et jetons de session. Ne jamais la joindre
à un ticket, la publier ou la déposer dans Git. Pour une protection contre la perte du
Mac, prévoir une copie chiffrée sur un support séparé choisi par le propriétaire.
Cette copie et son chiffrement ne sont pas encore mis en place. Aucun envoi cloud.

Périmètre : schéma public de l'application, migrations, données, séquences et contraintes.
Le contrôle compare les lignes (empreintes MD5, non signature de sécurité) ; l'archive
a une empreinte SHA-256. Hors périmètre : rôles/ACL du serveur, secrets Render, fichiers
Excel/XML sources et tout autre schéma. Ce n'est pas un test complet de reprise métier.

Une vraie reprise doit être restaurée dans une **nouvelle base**, avec validation des
contraintes, des parcours métier, des accès et rotation/révocation des anciennes
sessions, avant toute bascule. Ne pas utiliser `--clean`, `migrate reset` ou un seed
sur la base courante. Ne jamais brancher l'application sur une copie sans décision
explicite et plan de retour arrière.

Sources : [Prisma — sauvegardes](https://www.prisma.io/docs/postgres/database/backups),
[PostgreSQL 17 — pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html),
[pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).
