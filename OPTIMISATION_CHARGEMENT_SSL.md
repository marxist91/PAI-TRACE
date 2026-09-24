# Correctifs de chargement et SSL — 24 septembre 2026

## Périmètre

- Pages métier et Layout chargés à la demande avec React.lazy.
- Connexion conservée dans le chargement initial ; graphiques réservés aux statistiques.
- Navigation et notifications restent montées pendant le chargement d'une page.
- Message accessible de chargement et bouton de rechargement en cas d'échec.
- Aucun changement des droits, dates, calculs, exports ou données métier.

## Mesures du build (pas une mesure de vitesse réseau)

| JavaScript | Avant | Après |
| --- | ---: | ---: |
| Chargement initial brut | 1 021,66 Ko | 344,07 Ko |
| Chargement initial gzip | 291,48 Ko | 111,99 Ko |
| Bloc statistiques différé | inclus | 414,44 Ko |

Réduction initiale brute de 66 %, gzip de 62 %. Le code total reste nécessaire si
l'utilisateur visite toutes les pages. Aucun bloc ne dépasse 500 Ko ; l'avertissement
Vite a disparu sans augmenter son seuil. Trois tests vérifient le manifeste réel
du build, les dépendances initiales et les budgets. Ils sont ajoutés à la CI web.

## Connexion PostgreSQL

Le guide Prisma database-setup a confirmé le maintien du pool et de l'adaptateur
existants. Une fonction isolée explicite `verify-full` pour les alias `prefer`,
`require`, `verify-ca`, conservant la validation actuelle de pg 8 au changement de
version futur. Pas de `rejectUnauthorized: false` ajouté. Aucun secret modifié.
Les options de certificats restent dans l'URL ; pas de mélange avec un objet SSL
que le parseur pourrait écraser : https://node-postgres.com/features/ssl.
Les connexions sans mode SSL et le choix explicite libpq restent inchangés.
La normalisation concerne le runtime, pas la configuration CLI Prisma.

## Vérifications locales

- 82 tests backend réussis, dont 6 tests SSL ; compilation backend réussie.
- 13 tests frontend existants et 3 tests du build réussis ; compilation web réussie.
- Connexion à la base configurée et `SELECT 1` réussis, sans lecture métier ni écriture.
- Écran de connexion du build vérifié dans Chrome ; aucun parcours connecté rejoué.
- Aucun seed, migration, import ni nettoyage exécuté.

Ces changements ne sont pas encore commités, publiés ou déployés sur Render.
Après publication : attendre la CI, déployer manuellement, contrôler les logs SSL,
la connexion et la navigation entre conteneurs et statistiques avec un compte autorisé.
