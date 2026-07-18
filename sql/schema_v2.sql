-- ============================================================
-- POISSONNERIE D'EAU DOUCE — Schéma PostgreSQL V2 (complet)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom           VARCHAR(100) NOT NULL,
  prenom        VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('admin','employee')),
  photo_url     TEXT,
  telephone     VARCHAR(30),
  actif         BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

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

-- ─── STOCKS ──────────────────────────────────────────────────
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

-- ─── VENTES JOURNÉES ─────────────────────────────────────────
CREATE TABLE ventes_journees (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_vente  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employe_id, date_vente)
);

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

-- ─── MOUVEMENTS CAISSE ───────────────────────────────────────
CREATE TABLE mouvements_caisse (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(10) NOT NULL CHECK (type IN ('ajout','retrait')),
  montant      NUMERIC(12,2) NOT NULL CHECK (montant > 0),
  commentaire  TEXT NOT NULL,
  mois         VARCHAR(7) NOT NULL,
  statut       VARCHAR(20) NOT NULL DEFAULT 'en_attente'
                 CHECK (statut IN ('en_attente','approuvee','refusee')),
  approuve_par UUID REFERENCES users(id) ON DELETE SET NULL,
  approuve_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ENCAISSEMENTS ───────────────────────────────────────────
CREATE TABLE encaissements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  montant      NUMERIC(12,2) NOT NULL CHECK (montant > 0),
  commentaire  TEXT,
  mois         VARCHAR(7) NOT NULL,
  statut       VARCHAR(20) NOT NULL DEFAULT 'en_attente'
                 CHECK (statut IN ('en_attente','approuvee','refusee')),
  approuve_par UUID REFERENCES users(id) ON DELETE SET NULL,
  approuve_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DEMANDES (unifiées) ─────────────────────────────────────
CREATE TABLE demandes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(30) NOT NULL
                 CHECK (type IN ('modification_journee','annulation_reste','mouvement_caisse','encaissement')),
  ref_id       UUID,
  ref_table    VARCHAR(50),
  date_cible   DATE,
  motif        TEXT NOT NULL,
  statut       VARCHAR(20) NOT NULL DEFAULT 'en_attente'
                 CHECK (statut IN ('en_attente','approuvee','refusee')),
  approuve_par UUID REFERENCES users(id) ON DELETE SET NULL,
  approuve_at  TIMESTAMPTZ,
  expire_at    TIMESTAMPTZ,
  meta         JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MESSAGES CHAT ───────────────────────────────────────────
CREATE TABLE messages_chat (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_salon  DATE NOT NULL,
  auteur_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contenu     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRIGGERS updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_upd      BEFORE UPDATE ON users           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stocks_upd     BEFORE UPDATE ON stocks          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_journees_upd   BEFORE UPDATE ON ventes_journees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_upd    BEFORE UPDATE ON clients_vente   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── INDEX ───────────────────────────────────────────────────
CREATE INDEX idx_ventes_emp_date   ON ventes_journees(employe_id, date_vente);
CREATE INDEX idx_clients_journee   ON clients_vente(journee_id);
CREATE INDEX idx_messages_date     ON messages_chat(date_salon, created_at);
CREATE INDEX idx_stocks_type_bac   ON stocks(type_stock, bac_numero);
CREATE INDEX idx_stocks_date       ON stocks(date_depot);
CREATE INDEX idx_demandes_statut   ON demandes(statut, type, employe_id);
CREATE INDEX idx_prix_type_actif   ON prix_stock(type_stock, actif);
CREATE INDEX idx_mouvements_emp    ON mouvements_caisse(employe_id, mois);
CREATE INDEX idx_encaissements_emp ON encaissements(employe_id, mois);

-- ─── SEED : Prix par défaut ───────────────────────────────────
INSERT INTO prix_stock (type_stock, poids_categorie, prix_par_kg) VALUES
  ('silure', 'alevins', 2500),
  ('silure', '200g',    2500),
  ('silure', '400g',    2500),
  ('silure', '500g',    2500),
  ('silure', '600g',    2500),
  ('silure', '800g',    2500),
  ('silure', '1kg+',    2500);

-- ─── SEED : Compte Admin (mdp: Admin1234!) ────────────────────
-- IMPORTANT: Changer le mot de passe dès la première connexion !
-- Hash bcrypt de "Admin1234!" — générer le vôtre avec:
-- node -e "const b=require('bcryptjs'); b.hash('VotreMotDePasse',10).then(console.log)"
INSERT INTO users (nom, prenom, email, password_hash, role)
VALUES ('Patron', 'Admin', 'admin@poissonnerie.com',
  '$2b$10$rIJ5t5Y8Z9kK4mN6pQ3jLOl/YdD2F8x7gH0wE1vR4sT6uA9bC3n2W', 'admin');
-- ⚠️  Ce hash est un exemple. Remplacer par un vrai hash de votre mot de passe.
