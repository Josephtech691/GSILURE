-- GSILURE : journalisation des retraits effectués depuis la page Caisse admin.
-- À exécuter une seule fois dans Neon avant le déploiement du backend.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS admin_caisse_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portee VARCHAR(20) NOT NULL CHECK (portee IN ('employe','globale')),
  montant_total NUMERIC(14,2) NOT NULL CHECK (montant_total > 0),
  commentaire TEXT NOT NULL,
  date_operation DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mouvements_caisse
  ADD COLUMN IF NOT EXISTS operation_admin_id UUID
  REFERENCES admin_caisse_operations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admin_caisse_operations_date
  ON admin_caisse_operations(date_operation DESC);
CREATE INDEX IF NOT EXISTS idx_mouvements_operation_admin
  ON mouvements_caisse(operation_admin_id);
