-- ============================================================
-- MIGRATION V2 — Poissonnerie
-- À exécuter sur une DB existante (ou remplacer schema.sql pour neuf)
-- ============================================================

-- 1. Colonnes photo_profil + infos users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS photo_url       TEXT,
  ADD COLUMN IF NOT EXISTS telephone       VARCHAR(30),
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW();

-- 2. Stocks : suppression de valeur_totale GENERATED (on va la calculer à la volée)
--    et ajout type de bac + prix historisé par dépôt
ALTER TABLE stocks
  DROP COLUMN IF EXISTS valeur_totale,
  ADD COLUMN IF NOT EXISTS type_stock      VARCHAR(100) NOT NULL DEFAULT 'silure',
  ADD COLUMN IF NOT EXISTS bac_numero      SMALLINT CHECK (bac_numero BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS poids_categorie VARCHAR(50),   -- ex: 200g, 400g, alevins...
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW();

-- 3. Config prix : table pour gérer les prix par type de stock (historisé)
CREATE TABLE IF NOT EXISTS prix_stock (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_stock    VARCHAR(100) NOT NULL,
  poids_categorie VARCHAR(50),
  prix_par_kg   NUMERIC(10,2) NOT NULL CHECK (prix_par_kg > 0),
  actif         BOOLEAN DEFAULT TRUE,
  date_debut    DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin      DATE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Prix par défaut
INSERT INTO prix_stock (type_stock, poids_categorie, prix_par_kg, date_debut)
VALUES
  ('silure', 'alevins',  2500, CURRENT_DATE),
  ('silure', '200g',     2500, CURRENT_DATE),
  ('silure', '400g',     2500, CURRENT_DATE),
  ('silure', '500g',     2500, CURRENT_DATE),
  ('silure', '600g',     2500, CURRENT_DATE),
  ('silure', '800g',     2500, CURRENT_DATE),
  ('silure', '1kg+',     2500, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- 4. clients_vente : reste annulé (marché conclu)
ALTER TABLE clients_vente
  ADD COLUMN IF NOT EXISTS reste_annule         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reste_annule_motif   TEXT,
  ADD COLUMN IF NOT EXISTS reste_annule_statut  VARCHAR(20) DEFAULT NULL
    CHECK (reste_annule_statut IN ('en_attente', 'approuvee', 'refusee'));

-- 5. Table mouvements_caisse (ajout/retrait d'argent sur la caisse employé)
CREATE TABLE IF NOT EXISTS mouvements_caisse (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(10) NOT NULL CHECK (type IN ('ajout', 'retrait')),
  montant       NUMERIC(12,2) NOT NULL CHECK (montant > 0),
  commentaire   TEXT NOT NULL,
  statut        VARCHAR(20) NOT NULL DEFAULT 'en_attente'
                  CHECK (statut IN ('en_attente', 'approuvee', 'refusee')),
  approuve_par  UUID REFERENCES users(id) ON DELETE SET NULL,
  approuve_at   TIMESTAMPTZ,
  mois          VARCHAR(7) NOT NULL,   -- YYYY-MM
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table encaissements (argent soldé → versé au patron)
CREATE TABLE IF NOT EXISTS encaissements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  montant       NUMERIC(12,2) NOT NULL CHECK (montant > 0),
  commentaire   TEXT,
  mois          VARCHAR(7) NOT NULL,
  statut        VARCHAR(20) NOT NULL DEFAULT 'en_attente'
                  CHECK (statut IN ('en_attente', 'approuvee', 'refusee')),
  approuve_par  UUID REFERENCES users(id) ON DELETE SET NULL,
  approuve_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table demandes_generales (unifie toutes les demandes)
CREATE TABLE IF NOT EXISTS demandes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(30) NOT NULL
                    CHECK (type IN ('modification_journee','annulation_reste','mouvement_caisse','encaissement')),
  ref_id          UUID,        -- ID de l'objet concerné (client, journee, mouvement_caisse...)
  ref_table       VARCHAR(50), -- Nom de la table de référence
  date_cible      DATE,
  motif           TEXT NOT NULL,
  statut          VARCHAR(20) NOT NULL DEFAULT 'en_attente'
                    CHECK (statut IN ('en_attente', 'approuvee', 'refusee')),
  approuve_par    UUID REFERENCES users(id) ON DELETE SET NULL,
  approuve_at     TIMESTAMPTZ,
  expire_at       TIMESTAMPTZ,
  meta            JSONB,       -- données supplémentaires (ex: journee_id pour modif)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Index supplémentaires
CREATE INDEX IF NOT EXISTS idx_mouvements_employe ON mouvements_caisse(employe_id, mois);
CREATE INDEX IF NOT EXISTS idx_encaissements_employe ON encaissements(employe_id, mois);
CREATE INDEX IF NOT EXISTS idx_demandes_statut_type ON demandes(statut, type, employe_id);
CREATE INDEX IF NOT EXISTS idx_prix_stock_type ON prix_stock(type_stock, actif);
CREATE INDEX IF NOT EXISTS idx_stocks_type_bac ON stocks(type_stock, bac_numero);

-- 9. Trigger updated_at pour users
CREATE TRIGGER IF NOT EXISTS trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 10. PWA: table sync_queue pour offline (gérée côté client en IndexedDB, pas en DB)
-- NOTE: La sync offline est gérée en IndexedDB côté frontend + Service Worker

