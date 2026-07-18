-- ============================================================
-- POISSONNERIE V2 — Schéma PostgreSQL COMPLET
-- Exécuter ce fichier sur une base neuve
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fonction updated_at (déclarée en premier car utilisée dans les triggers)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom           VARCHAR(100) NOT NULL,
  prenom        VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('admin','employee')),
  photo_url     TEXT,
  telephone     VARCHAR(30),
  actif         BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── PRIX STOCK (historisé) ──────────────────────────────────
CREATE TABLE prix_stock (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_stock      VARCHAR(100) NOT NULL,
  poids_categorie VARCHAR(50),
  prix_par_kg     NUMERIC(10,2) NOT NULL CHECK (prix_par_kg > 0),
  actif           BOOLEAN DEFAULT TRUE,
  date_debut      DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin        DATE,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_prix_stock_type ON prix_stock(type_stock, actif);

-- ─── STOCKS (dépôts) ─────────────────────────────────────────
CREATE TABLE stocks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_depot      DATE NOT NULL DEFAULT CURRENT_DATE,
  quantite_kg     NUMERIC(10,2) NOT NULL CHECK (quantite_kg > 0),
  prix_par_kg     NUMERIC(10,2) NOT NULL DEFAULT 2500,
  type_stock      VARCHAR(100) NOT NULL DEFAULT 'silure',
  poids_categorie VARCHAR(50),
  bac_numero      SMALLINT CHECK (bac_numero BETWEEN 1 AND 7),
  note            TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_stocks_date    ON stocks(date_depot);
CREATE INDEX idx_stocks_type_bac ON stocks(type_stock, bac_numero);
CREATE TRIGGER trg_stocks_updated BEFORE UPDATE ON stocks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── VENTES JOURNÉES ─────────────────────────────────────────
CREATE TABLE ventes_journees (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_vente  DATE NOT NULL DEFAULT CURRENT_DATE,
  verrouille  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employe_id, date_vente)
);
CREATE INDEX idx_ventes_employe_date ON ventes_journees(employe_id, date_vente);
CREATE TRIGGER trg_ventes_updated BEFORE UPDATE ON ventes_journees FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── CLIENTS VENTE ───────────────────────────────────────────
CREATE TABLE clients_vente (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journee_id            UUID NOT NULL REFERENCES ventes_journees(id) ON DELETE CASCADE,
  numero_client         INTEGER NOT NULL,
  kg_achetes            NUMERIC(10,2) NOT NULL CHECK (kg_achetes > 0),
  montant_recu          NUMERIC(12,2) NOT NULL CHECK (montant_recu >= 0),
  heure_approx          TIME NOT NULL DEFAULT CURRENT_TIME,
  commentaire           TEXT,
  reste_annule          BOOLEAN DEFAULT FALSE,
  reste_annule_motif    TEXT,
  reste_annule_statut   VARCHAR(20) CHECK (reste_annule_statut IN ('en_attente','approuvee','refusee')),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_clients_journee ON clients_vente(journee_id);
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON clients_vente FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── MOUVEMENTS CAISSE ───────────────────────────────────────
CREATE TABLE mouvements_caisse (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(10) NOT NULL CHECK (type IN ('ajout','retrait')),
  montant       NUMERIC(12,2) NOT NULL CHECK (montant > 0),
  commentaire   TEXT NOT NULL,
  statut        VARCHAR(20) NOT NULL DEFAULT 'en_attente'
                  CHECK (statut IN ('en_attente','approuvee','refusee')),
  approuve_par  UUID REFERENCES users(id) ON DELETE SET NULL,
  approuve_at   TIMESTAMPTZ,
  mois          VARCHAR(7) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_mouvements_employe ON mouvements_caisse(employe_id, mois);

-- ─── ENCAISSEMENTS (versements au patron) ────────────────────
CREATE TABLE encaissements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  montant       NUMERIC(12,2) NOT NULL CHECK (montant > 0),
  commentaire   TEXT,
  mois          VARCHAR(7) NOT NULL,
  statut        VARCHAR(20) NOT NULL DEFAULT 'en_attente'
                  CHECK (statut IN ('en_attente','approuvee','refusee')),
  approuve_par  UUID REFERENCES users(id) ON DELETE SET NULL,
  approuve_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_encaissements_employe ON encaissements(employe_id, mois);

-- ─── DEMANDES (table unifiée) ─────────────────────────────────
CREATE TABLE demandes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(30) NOT NULL CHECK (type IN ('modification_journee','annulation_reste','mouvement_caisse','encaissement')),
  ref_id        UUID,
  ref_table     VARCHAR(50),
  date_cible    DATE,
  motif         TEXT NOT NULL,
  statut        VARCHAR(20) NOT NULL DEFAULT 'en_attente'
                  CHECK (statut IN ('en_attente','approuvee','refusee')),
  approuve_par  UUID REFERENCES users(id) ON DELETE SET NULL,
  approuve_at   TIMESTAMPTZ,
  expire_at     TIMESTAMPTZ,
  meta          JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_demandes_statut_type ON demandes(statut, type, employe_id);

-- ─── MESSAGES CHAT (par journée) ─────────────────────────────
CREATE TABLE messages_chat (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_salon  DATE NOT NULL,
  auteur_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contenu     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_messages_date ON messages_chat(date_salon, created_at);

-- ─── SEED : PRIX PAR DÉFAUT ───────────────────────────────────
INSERT INTO prix_stock (type_stock, poids_categorie, prix_par_kg, date_debut) VALUES
  ('silure','alevins',2500,CURRENT_DATE),
  ('silure','200g',   2500,CURRENT_DATE),
  ('silure','400g',   2500,CURRENT_DATE),
  ('silure','500g',   2500,CURRENT_DATE),
  ('silure','600g',   2500,CURRENT_DATE),
  ('silure','800g',   2500,CURRENT_DATE),
  ('silure','1kg+',   2500,CURRENT_DATE);

-- ─── SEED : COMPTE ADMIN PAR DÉFAUT ──────────────────────────
-- Mot de passe : Admin1234!  (À CHANGER EN PRODUCTION via /admin/profil)
INSERT INTO users (nom, prenom, email, password_hash, role)
VALUES ('Patron','Admin','admin@poissonnerie.com',
  '$2b$10$8KzaNEt7UPFCVIwYuQfJAO0KI2ySmm1YWsGTgEhp/E.UHEJqj4a5K','admin');
-- Le hash ci-dessus correspond à "Admin1234!"
-- Pour générer votre propre hash : node -e "const b=require('bcryptjs'); console.log(b.hashSync('VotreMotDePasse',10))"
