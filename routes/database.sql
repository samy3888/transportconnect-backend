-- BASE DE DONNÉES TRANSPORTCONNECT

-- Sociétés de transport
CREATE TABLE societes (
id SERIAL PRIMARY KEY,
nom VARCHAR(100) NOT NULL,
email VARCHAR(100) UNIQUE NOT NULL,
telephone VARCHAR(20),
mot_de_passe VARCHAR(255) NOT NULL,
created_at TIMESTAMP DEFAULT NOW()
);

-- Chauffeurs
CREATE TABLE chauffeurs (
id SERIAL PRIMARY KEY,
nom VARCHAR(100) NOT NULL,
email VARCHAR(100) UNIQUE NOT NULL,
telephone VARCHAR(20),
mot_de_passe VARCHAR(255) NOT NULL,
societe_id INTEGER REFERENCES societes(id),
disponible BOOLEAN DEFAULT true,
created_at TIMESTAMP DEFAULT NOW()
);

-- Patients
CREATE TABLE patients (
id SERIAL PRIMARY KEY,
nom VARCHAR(100) NOT NULL,
adresse TEXT,
telephone VARCHAR(20),
token VARCHAR(100) UNIQUE NOT NULL,
created_at TIMESTAMP DEFAULT NOW()
);

-- Trajets
CREATE TABLE trajets (
id SERIAL PRIMARY KEY,
patient_id INTEGER REFERENCES patients(id),
chauffeur_id INTEGER REFERENCES chauffeurs(id),
societe_id INTEGER REFERENCES societes(id),
adresse_depart TEXT,
adresse_arrivee TEXT,
heure_prevue TIMESTAMP,
statut VARCHAR(20) DEFAULT 'en_attente',
created_at TIMESTAMP DEFAULT NOW()
);