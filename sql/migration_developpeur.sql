-- ============================================================
-- Compte développeur + journal des erreurs
-- À exécuter une fois (idempotent). La création du compte se fait ensuite avec :
--   cd backend && node scripts/creer-developpeur.js email@exemple.com "MotDePasseSolide"
-- ============================================================

-- 1) Autoriser le rôle 'developer' sur la table users
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'users'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','employee','developer'));

-- 2) Journal des erreurs (créé aussi automatiquement au premier enregistrement)
CREATE TABLE IF NOT EXISTS app_errors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empreinte     VARCHAR(40) NOT NULL,
  source        VARCHAR(20) NOT NULL,
  niveau        VARCHAR(10) NOT NULL DEFAULT 'error',
  message       TEXT NOT NULL,
  stack         TEXT,
  route         VARCHAR(300),
  methode       VARCHAR(10),
  statut_http   SMALLINT,
  user_id       UUID,
  user_email    VARCHAR(200),
  user_role     VARCHAR(20),
  user_agent    VARCHAR(300),
  contexte      JSONB,
  occurrences   INTEGER NOT NULL DEFAULT 1,
  premiere_vue  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  derniere_vue  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolu        BOOLEAN NOT NULL DEFAULT FALSE,
  resolu_le     TIMESTAMPTZ,
  note          TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_errors_empreinte ON app_errors(empreinte);
CREATE INDEX IF NOT EXISTS idx_app_errors_derniere ON app_errors(derniere_vue DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_resolu ON app_errors(resolu, derniere_vue DESC);
