-- ============================================================
-- POISSONNERIE D'EAU DOUCE - Schéma PostgreSQL
-- ============================================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE : users (Admin + Employés)
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom           VARCHAR(100) NOT NULL,
  prenom        VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'employee')),
  actif         BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : stocks (Dépôts de poissons en kg)
-- ============================================================
CREATE TABLE stocks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_depot    DATE NOT NULL DEFAULT CURRENT_DATE,
  quantite_kg   NUMERIC(10,2) NOT NULL CHECK (quantite_kg > 0),
  prix_par_kg   NUMERIC(10,2) NOT NULL DEFAULT 2500,
  valeur_totale NUMERIC(12,2) GENERATED ALWAYS AS (quantite_kg * prix_par_kg) STORED,
  note          TEXT,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : ventes_journees (Une entrée par employé par jour)
-- ============================================================
CREATE TABLE ventes_journees (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_vente    DATE NOT NULL DEFAULT CURRENT_DATE,
  verrouille    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employe_id, date_vente)
);

-- ============================================================
-- TABLE : clients_vente (Clients dans une journée de vente)
-- ============================================================
CREATE TABLE clients_vente (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journee_id       UUID NOT NULL REFERENCES ventes_journees(id) ON DELETE CASCADE,
  numero_client    INTEGER NOT NULL,           -- Client 1, Client 2...
  kg_achetes       NUMERIC(10,2) NOT NULL CHECK (kg_achetes > 0),
  montant_recu     NUMERIC(12,2) NOT NULL CHECK (montant_recu >= 0),
  heure_approx     TIME NOT NULL DEFAULT CURRENT_TIME,
  commentaire      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : demandes_modification (Requêtes employé → admin)
-- ============================================================
CREATE TABLE demandes_modification (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  journee_id      UUID NOT NULL REFERENCES ventes_journees(id) ON DELETE CASCADE,
  date_cible      DATE NOT NULL,
  motif           TEXT NOT NULL,
  statut          VARCHAR(20) NOT NULL DEFAULT 'en_attente' 
                    CHECK (statut IN ('en_attente', 'approuvee', 'refusee')),
  approuve_par    UUID REFERENCES users(id) ON DELETE SET NULL,
  approuve_at     TIMESTAMPTZ,
  expire_at       TIMESTAMPTZ,               -- approuve_at + 24h
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : messages_chat (Chat par journée)
-- ============================================================
CREATE TABLE messages_chat (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_salon    DATE NOT NULL,               -- Le "salon" = la date
  auteur_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contenu       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEX pour les performances
-- ============================================================
CREATE INDEX idx_ventes_employe_date ON ventes_journees(employe_id, date_vente);
CREATE INDEX idx_clients_journee ON clients_vente(journee_id);
CREATE INDEX idx_messages_date ON messages_chat(date_salon, created_at);
CREATE INDEX idx_stocks_date ON stocks(date_depot);
CREATE INDEX idx_demandes_statut ON demandes_modification(statut, employe_id);

-- ============================================================
-- TRIGGER : met à jour updated_at automatiquement
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ventes_journees_updated
  BEFORE UPDATE ON ventes_journees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_clients_vente_updated
  BEFORE UPDATE ON clients_vente
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED : Compte Admin par défaut
-- (mot de passe: Admin1234! — à changer en prod)
-- hash bcrypt généré avec saltRounds=10
-- ============================================================
INSERT INTO users (nom, prenom, email, password_hash, role)
VALUES (
  'Patron', 'Admin',
  'admin@poissonnerie.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin'
);
