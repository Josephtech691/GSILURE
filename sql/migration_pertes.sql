-- Table des pertes de stock (patron + employé)
CREATE TABLE IF NOT EXISTS pertes_stock (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_perte      VARCHAR(20) NOT NULL CHECK (type_perte IN ('perte_poids', 'mort')),
  stock_id        UUID REFERENCES stocks(id) ON DELETE SET NULL,
  type_stock      VARCHAR(100),
  poids_categorie VARCHAR(50),
  bac_numero      SMALLINT,
  kg_perdus       NUMERIC(10,2) NOT NULL CHECK (kg_perdus > 0),
  commentaire     TEXT,
  declare_par     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mois            VARCHAR(7) NOT NULL,
  annee           SMALLINT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pertes_date    ON pertes_stock(created_at);
CREATE INDEX IF NOT EXISTS idx_pertes_mois    ON pertes_stock(mois);
CREATE INDEX IF NOT EXISTS idx_pertes_annee   ON pertes_stock(annee);
CREATE INDEX IF NOT EXISTS idx_pertes_declare ON pertes_stock(declare_par);
