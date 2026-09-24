# Recette en ligne gratuite — Render + Prisma

Cette configuration prépare un environnement de TEST, pas une production métier.
Un service Render Free sert React, Express et Socket.IO sur une même URL HTTPS.
La base reste sur Prisma ; aucune base Render ni ressource payante n'est créée.
Le fichier `render.yaml` désactive les déploiements automatiques après publication.

## Avant de publier

- Vérifier dans Prisma que le projet utilise bien l'offre gratuite et ses quotas.
- Choisir explicitement la base à connecter : une base de recette séparée est préférable.
  Utiliser la base actuelle partagerait toutes les écritures entre le site et le local.
  Ne pas copier des données portuaires réelles dans un service externe sans autorisation.
- Sauvegarder la base choisie avant toute migration. Ne jamais exécuter les scripts
  `seed`, `db:demo`, nettoyage ou simulation pour ce déploiement.
- Désactiver les comptes de démonstration et changer les mots de passe connus depuis
  l'administration AVANT d'exposer la base actuelle. Garder un administrateur actif.
- Si la base est neuve, prévoir la création sécurisée du premier administrateur :
  ce guide ne crée ni compte par défaut ni mot de passe public.
- Publier les fichiers de préparation dans GitHub une fois validés.

## Création du service (connexion personnelle nécessaire)

1. Se connecter à Render, choisir le workspace gratuit/Hobby, puis **New → Blueprint**.
2. Autoriser uniquement le dépôt `marxist91/PAI-TRACE`, sélectionner la branche contenant
   `render.yaml`. Laisser le répertoire racine du dépôt : `backend` et `web` sont nécessaires.
3. Vérifier que le seul service proposé est `pia-trace-test`, **plan Free / 0 $**.
   Si un paiement ou une ressource payante est demandé, arrêter sans valider.
4. Renseigner `DATABASE_URL` directement dans le champ secret Render avec la connexion
   PostgreSQL de la base Prisma choisie (conserver les options SSL fournies par Prisma).
   Ne pas envoyer cette URL dans une conversation ni la committer.
   Le runtime rend explicite `sslmode=verify-full` pour les anciens alias pg
   `prefer`, `require` et `verify-ca`, sans changer leur validation actuelle.
   Les certificats et autres options sont conservés ; les connexions locales sans SSL
   et le mode explicitement demandé `uselibpqcompat=true` restent inchangés.
   Cette normalisation concerne le runtime Node, pas les commandes Prisma de migration.
5. Les deux secrets JWT sont générés séparément par Render. Ne pas recopier ceux de
   développement. `RENDER_EXTERNAL_URL` est fourni par Render ; il sert d'origine CORS.
6. Lancer le déploiement initial. Aucun seed, suppression ou migration automatique
   n'est exécuté par les commandes de build/démarrage.

Le runtime utilise `NODE_ENV=production` pour les protections techniques ; les données
restent celles de recette. Le plan est explicitement `free` (ne jamais retirer ce champ).

## Schéma de la base

Pour la base existante déjà à jour, aucune migration n'est nécessaire. Pour une autre
base, après vérification de la cible et sauvegarde, appliquer les migrations depuis
un poste autorisé avec `npx prisma migrate deploy` dans `backend`, en utilisant la
connexion de CETTE base. Ne pas employer `db push` ni `migrate reset`.
Les migrations ne sont volontairement pas exécutées à chaque réveil du service gratuit.

## Vérifications après déploiement

- `/api/health` doit répondre `{"status":"OK",...}`. Ce test contrôle le serveur,
  pas la connexion à la base : la connexion utilisateur doit aussi être testée.
- Se connecter avec un compte autorisé, ouvrir un conteneur et recharger cette URL.
- Vérifier les droits ADMIN, logisticien, LCT, Togo Terminal et agent PIA.
- Tester l'import d'un petit manifeste de recette, puis les notifications entre deux sessions.
- Exporter une période connue et vérifier ses dates et totaux.
- Tester un redémarrage et vérifier que les données Prisma sont conservées.
- Vérifier la mémoire pendant un gros import : l'offre Free ne dispose que de 512 Mo.

## Limites gratuites / retour arrière

Render peut mettre le service en veille après 15 minutes sans trafic ; le réveil prend
environ une minute. Des quotas mensuels s'appliquent. Sans moyen de paiement, un quota
épuisé peut interrompre le service : ne pas passer en offre payante pour contourner cela.
Le disque local est éphémère : les imports actuels sont traités en mémoire et les données
enregistrées dans Prisma, mais il ne faut pas ajouter d'archives locales persistantes.
Conserver les fichiers sources hors du serveur et une sauvegarde externe de la base.

Pour suspendre les tests, suspendre le service Render sans supprimer la base Prisma.
Un retour à un ancien déploiement ne restaure pas les données de la base.
Ne pas activer les déploiements automatiques tant que la recette publique n'est pas validée.

Références : https://render.com/docs/free — https://render.com/docs/blueprint-spec

## État

Configuration préparée localement. Aucun service distant créé, aucun abonnement souscrit,
aucune base migrée ou modifiée par cette préparation. La mise en ligne attend la connexion
Render, la sélection explicite de la base et la sécurisation des comptes.
