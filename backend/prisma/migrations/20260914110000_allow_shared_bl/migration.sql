-- A B/L may cover multiple containers; keep the non-unique lookup index.
DROP INDEX IF EXISTS "public"."Conteneur_numeroBL_key";
