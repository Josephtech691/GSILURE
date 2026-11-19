-- GSILURE : champs de date nécessaires à l'historique de caisse.
-- À exécuter une seule fois dans Neon avant le déploiement du backend.
ALTER TABLE mouvements_caisse
  ADD COLUMN IF NOT EXISTS date_mouvement DATE NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE encaissements
  ADD COLUMN IF NOT EXISTS date_encaissement DATE NOT NULL DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_mouvements_caisse_date
  ON mouvements_caisse (date_mouvement DESC);

CREATE INDEX IF NOT EXISTS idx_encaissements_date
  ON encaissements (date_encaissement DESC);

-- Backfill explicite des anciennes lignes avec leur date de création.
UPDATE mouvements_caisse
SET date_mouvement = created_at::date
WHERE created_at IS NOT NULL;

UPDATE encaissements
SET date_encaissement = created_at::date
WHERE created_at IS NOT NULL;
