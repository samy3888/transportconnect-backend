const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// ✅ MIGRATIONS AUTO
const migrations = [
`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS societe_id INTEGER`,
`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS prenom VARCHAR(255)`,
`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS telephone VARCHAR(50)`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS ville VARCHAR(255)`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS type_transport VARCHAR(100)`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS adresse VARCHAR(255)`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS code_postal VARCHAR(20)`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS siret VARCHAR(50)`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS description TEXT`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS nb_vehicules VARCHAR(20)`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS telephone VARCHAR(50)`,
];

migrations.forEach(sql => {
pool.query(sql).catch(e => console.log('Migration auth:', e.message));
});

// ✅ TABLE PATIENTS COMPTES
pool.query(`CREATE TABLE IF NOT EXISTS patients_comptes (
id SERIAL PRIMARY KEY,
nom VARCHAR(255),
prenom VARCHAR(255),
email VARCHAR(255) UNIQUE,
mot_de_passe VARCHAR(255),
telephone VARCHAR(50),
adresse VARCHAR(255),
ville VARCHAR(255),
code_postal VARCHAR(20),
date_naissance VARCHAR(50),
contact_urgence VARCHAR(255),
tel_urgence VARCHAR(50),
is_mineur BOOLEAN DEFAULT false,
nom_parent VARCHAR(255),
tel_parent VARCHAR(50),
numero_dossier VARCHAR(20),
created_at TIMESTAMP DEFAULT NOW()
)`).then(() => console.log('Table patients_comptes OK')).catch(e => console.log(e.message));

// ✅ TABLE DEMANDES
pool.query(`CREATE TABLE IF NOT EXISTS demandes (
id SERIAL PRIMARY KEY,
patient_id INTEGER,
societe_id INTEGER,
patient_nom VARCHAR(255),
patient_telephone VARCHAR(50),
adresse_depart VARCHAR(255),
adresse_arrivee VARCHAR(255),
date VARCHAR(255),
statut VARCHAR(50) DEFAULT 'en_attente',
patient_token VARCHAR(50),
nom_societe VARCHAR(255),
type_transport VARCHAR(100),
mobilite VARCHAR(100),
accompagnant BOOLEAN DEFAULT false,
urgent BOOLEAN DEFAULT false,
commentaire TEXT,
created_at TIMESTAMP DEFAULT NOW()
)`).then(() => console.log('Table demandes OK')).catch(e => console.log(e.message));

// ===========================
// LOGIN SOCIÉTÉ ET CHAUFFEUR
// ===========================
router.post('/login', async (req, res) => {
const { email, password } = req.body;
try {
let result = await pool.query('SELECT * FROM societes WHERE email = $1', [email]);
let role = 'societe';

if (result.rows.length === 0) {
result = await pool.query('SELECT * FROM chauffeurs WHERE email = $1', [email]);
role = 'chauffeur';
}

if (result.rows.length === 0) {
return res.status(400).json({ error: 'Identifiants incorrects' });
}

const user = result.rows[0];

if (role === 'societe' && user.actif === false) {
return res.status(403).json({ error: 'Compte non activé — contactez TransportConnect au 06 44 87 90 42' });
}

const valid = await bcrypt.compare(password, user.mot_de_passe);
if (!valid) return res.status(400).json({ error: 'Identifiants incorrects' });

const token = jwt.sign(
{ id: user.id, role, societe_id: role === 'societe' ? user.id : user.societe_id },
process.env.JWT_SECRET || 'TransportConnect2024SecretKey!',
{ expiresIn: '7d' }
);

res.json({
success: true,
token,
user: {
id: user.id,
name: user.nom,
email: user.email,
role,
societe_id: role === 'societe' ? user.id : user.societe_id,
is_admin: user.is_admin || false,
ville: user.ville,
telephone: user.telephone,
type_transport: user.type_transport,
siret: user.siret,
}
});
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// ===========================
// LOGIN PATIENT
// ===========================
router.post('/login-patient', async (req, res) => {
const { email, password } = req.body;
try {
const result = await pool.query('SELECT * FROM patients_comptes WHERE email = $1', [email]);
if (result.rows.length === 0) return res.status(400).json({ error: 'Identifiants incorrects' });
const user = result.rows[0];
const valid = await bcrypt.compare(password, user.mot_de_passe);
if (!valid) return res.status(400).json({ error: 'Identifiants incorrects' });
const token = jwt.sign(
{ id: user.id, role: 'patient' },
process.env.JWT_SECRET || 'TransportConnect2024SecretKey!',
{ expiresIn: '7d' }
);
res.json({
success: true,
token,
user: {
id: user.id,
nom: user.nom,
prenom: user.prenom,
email: user.email,
telephone: user.telephone,
ville: user.ville,
adresse: user.adresse,
date_naissance: user.date_naissance,
contact_urgence: user.contact_urgence,
numero_dossier: user.numero_dossier,
role: 'patient'
}
});
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

// ===========================
// INSCRIPTION PATIENT
// ===========================
router.post('/register-patient', async (req, res) => {
const { nom, prenom, email, password, telephone, adresse, ville, code_postal, date_naissance, contact_urgence, tel_urgence, is_mineur, nom_parent, tel_parent } = req.body;
try {
const exist = await pool.query('SELECT * FROM patients_comptes WHERE email = $1', [email]);
if (exist.rows.length > 0) return res.status(400).json({ error: 'Cet email est déjà utilisé' });
const hash = await bcrypt.hash(password, 10);
// Numéro dossier unique
const numero_dossier = 'TC' + Date.now().toString().slice(-6);
const result = await pool.query(
`INSERT INTO patients_comptes (nom, prenom, email, mot_de_passe, telephone, adresse, ville, code_postal, date_naissance, contact_urgence, tel_urgence, is_mineur, nom_parent, tel_parent, numero_dossier)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
[nom, prenom, email, hash, telephone, adresse, ville, code_postal, date_naissance, contact_urgence, tel_urgence, is_mineur, nom_parent, tel_parent, numero_dossier]
);
const user = result.rows[0];
const token = jwt.sign(
{ id: user.id, role: 'patient' },
process.env.JWT_SECRET || 'TransportConnect2024SecretKey!',
{ expiresIn: '7d' }
);
res.json({
success: true,
token,
user: {
id: user.id,
nom: user.nom,
prenom: user.prenom,
email: user.email,
telephone: user.telephone,
ville: user.ville,
numero_dossier: user.numero_dossier,
role: 'patient'
}
});
} catch (err) {
console.error('REGISTER PATIENT:', err.message);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// ===========================
// INSCRIPTION SOCIÉTÉ
// ===========================
router.post('/register-societe', async (req, res) => {
const { nom, email, password, telephone, ville, adresse, code_postal, siret, description, nb_vehicules, type_transport } = req.body;
try {
const exist = await pool.query('SELECT * FROM societes WHERE email = $1', [email]);
if (exist.rows.length > 0) return res.status(400).json({ error: 'Cet email est déjà utilisé' });
const hash = await bcrypt.hash(password, 10);
const result = await pool.query(
`INSERT INTO societes (nom, email, mot_de_passe, telephone, actif, ville, adresse, code_postal, siret, description, nb_vehicules, type_transport)
VALUES ($1, $2, $3, $4, false, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
[nom, email, hash, telephone, ville, adresse, code_postal, siret, description, nb_vehicules, type_transport || 'Médical (VSL/Ambulance)']
);
res.json({ success: true, societe: result.rows[0] });
} catch (err) {
console.error('REGISTER SOCIETE:', err.message);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// ===========================
// INSCRIPTION CHAUFFEUR
// ===========================
router.post('/register-chauffeur', async (req, res) => {
const { nom, prenom, email, password, telephone, societe_id } = req.body;
try {
if (!password) return res.status(400).json({ error: 'Mot de passe requis' });
const exist = await pool.query('SELECT * FROM chauffeurs WHERE email = $1', [email]);
if (exist.rows.length > 0) return res.status(400).json({ error: 'Cet email est déjà utilisé' });
const hash = await bcrypt.hash(password, 10);
const result = await pool.query(
'INSERT INTO chauffeurs (nom, prenom, email, mot_de_passe, telephone, societe_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
[nom, prenom, email, hash, telephone, societe_id]
);
res.json({ success: true, chauffeur: result.rows[0] });
} catch (err) {
console.error('REGISTER CHAUFFEUR:', err.message);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// ===========================
// LISTE CHAUFFEURS SOCIÉTÉ
// ===========================
router.get('/chauffeurs', async (req, res) => {
try {
const authHeader = req.headers['authorization'];
const token = authHeader && authHeader.split(' ')[1];
if (!token) return res.status(401).json({ error: 'Token manquant' });
const decoded = jwt.verify(token, process.env.JWT_SECRET || 'TransportConnect2024SecretKey!');
const result = await pool.query(
'SELECT id, nom, prenom, email, telephone, societe_id, disponible FROM chauffeurs WHERE societe_id = $1',
[decoded.societe_id]
);
res.json(result.rows);
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

// ===========================
// LISTE SOCIÉTÉS POUR PASSAGERS
// ===========================
router.get('/societes', async (req, res) => {
try {
const result = await pool.query(
'SELECT id, nom, ville, code_postal, type_transport, telephone, description, nb_vehicules FROM societes WHERE actif = true ORDER BY nom'
);
res.json(result.rows);
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

module.exports = router;
