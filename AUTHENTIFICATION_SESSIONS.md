# Authentification et session unique

## Correction

- Identifiants de démonstration retirés du formulaire et du bundle frontend.
- « Se souvenir de moi » décoché : sessionStorage, durée maximale serveur 8 heures.
- Option cochée : localStorage, durée maximale serveur 7 jours.
- Aucun mot de passe stocké par cette option ; uniquement les jetons et le profil.
- Profil enregistré validé par refresh + /auth/me avant de donner accès à l'application.
- Cache métier vidé à la déconnexion/changement de session. Minuterie d'expiration nettoyée.
- Échec réseau de déconnexion signalé : ne pas prétendre que la session a été libérée.

La fermeture du navigateur ne garantit pas une déconnexion côté serveur. Le compte
reste réservé jusqu'à déconnexion, expiration ou libération par un administrateur.
Les onglets partageant un jeton sont la même session, pas deux connexions distinctes.
La copie volontaire ou le vol de jetons n'est pas empêché par cette mesure.

## Contrôle serveur sans migration

La table RefreshToken existante identifie la session, son expiration et son utilisateur.
Les connexions sont sérialisées par verrou transactionnel sur l'utilisateur : deux
demandes simultanées donnent 200 et 409. Chaque access token est lié à une session
existante, non expirée, ainsi qu'à tokenVersion. Logout révoque immédiatement les
jetons d'accès, le refresh et les sockets du compte. Le rejeu d'un ancien logout ne
révoque pas une session créée depuis.

ADMIN peut « Libérer la session » après confirmation dans Utilisateurs. Un autre rôle
ne peut pas le faire. La création d'un compte ne connecte pas l'administrateur à ce
nouveau compte et n'émet plus de jetons pour lui.

## Bascule et limites importantes

Au déploiement, les anciens jetons sans identifiant de session sont refusés : tous
les utilisateurs devront se reconnecter. Les anciennes données localStorage ne sont
pas réutilisées. Les sessions historiques sont nettoyées lors de la prochaine connexion.

**Changer le mot de passe du compte de démonstration ou le désactiver avant utilisation
réelle.** Le retirer de l'écran ne révoque pas un mot de passe déjà divulgué dans les
anciennes versions publiques. Aucun mot de passe réel n'a été changé par ce correctif.
Un gestionnaire de mots de passe du navigateur peut toujours proposer des identifiants
qu'il a enregistrés : supprimer cette entrée sur les postes partagés. L'application ne
peut pas effacer le coffre du navigateur.

Les jetons restent en stockage JavaScript (architecture actuelle) : protection XSS,
cookies HttpOnly, rotation des refresh tokens et MFA restent des améliorations distinctes.
Pas d'affirmation de sécurité absolue ni de protection contre le partage d'identifiants.

## Vérification

Tests unitaires et build, stockage temporaire/persistant sans mot de passe, champs vides,
refus des anciens jetons, concurrence, refresh, logout, rejeu, expiration et libération
ADMIN. Tests PostgreSQL seulement dans une base Docker neuve. La CI exécute désormais
la recette `test:auth-db` et les tests frontend de session.

## Actions sur les comptes

ADMIN dispose des boutons Désactiver/Réactiver et Supprimer avec confirmation.
La désactivation conserve l’historique et révoque les sessions. La suppression est
refusée pour son propre compte, pour le dernier administrateur actif, ou lorsqu’un
conteneur, mouvement, manifeste, notification, paramètre ou rapport référence le compte.
Les modifications concurrentes sont refusées par contrôle de version et transaction.
La suppression d’un compte inutilisé est définitive ; aucun historique métier n’est supprimé.
