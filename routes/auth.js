const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// ✅ Colonnes automatiques
pool.query(`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS societe_id INTEGER`)
.then(() => console.log('Colonne societe_id OK'))
.catch(e => console.log('societe_id:', e.message));

pool.query(`ALTER TABLE societes ADD COLUMN IF NOT EXISTS ville VARCHAR(255)`)
.then(() => console.log('Colonne ville OK'))
.catch(e => console.log('ville:', e.message));

pool.query(`ALTER TABLE societes ADD COLUMN IF NOT EXISTS type_transport VARCHAR(100) DEFAULT 'VSL'`)
.then(() => console.log('Colonne type_transport OK'))
.catch(e => console.log('type_transport:', e.message));

// ✅ Créer table patients
pool.query(`CREATE TABLE IF NOT EXISTS patients_comptes (
id SERIAL PRIMARY KEY,
nom VARCHAR(255),
prenom VARCHAR(255),
email VARCHAR(255) UNIQUE,
mot_de_passe VARCHAR(255),
telephone VARCHAR(50),
adresse VARCHAR(255),
ville VARCHAR(255),
created_at TIMESTAMP DEFAULT NOW()
)`)
.then(() => console.log('Table patients_comptes OK'))
.catch(e => console.log('patients_comptes:', e.message));

// ✅ Créer table demandes
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
created_at TIMESTAMP DEFAULT NOW()
)`)
.then(() => console.log('Table demandes OK'))
.catch(e => console.log('demandes:', e.message));

// LOGIN SOCIÉTÉ ET CHAUFFEUR
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
return res.status(403).json({ error: 'Compte non activé — contactez TransportConnect' });
}

const valid = await bcrypt.compare(password, user.mot_de_passe);
if (!valid) {
return res.status(400).json({ error: 'Identifiants incorrects' });
}

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
societe_id: role === 'societe' ? user.id : user.societe_id
}
});
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// ✅ LOGIN PATIENT
router.post('/login-patient', async (req, res) => {
const { email, password } = req.body;
try {
const result = await pool.query('SELECT * FROM patients_comptes WHERE email = $1', [email]);
if (result.rows.length === 0) {
return res.status(400).json({ error: 'Identifiants incorrects' });
}
const user = result.rows[0];
const valid = await bcrypt.compare(password, user.mot_de_passe);
if (!valid) {
return res.status(400).json({ error: 'Identifiants incorrects' });
}
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
role: 'patient'
}
});
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// ✅ INSCRIPTION PATIENT
router.post('/register-patient', async (req, res) => {
const { nom, prenom, email, password, telephone, adresse, ville } = req.body;
try {
const exist = await pool.query('SELECT * FROM patients_comptes WHERE email = $1', [email]);
if (exist.rows.length > 0) {
return res.status(400).json({ error: 'Email déjà utilisé' });
}
const hash = await bcrypt.hash(password, 10);
const result = await pool.query(
'INSERT INTO patients_comptes (nom, prenom, email, mot_de_passe, telephone, adresse, ville) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
[nom, prenom, email, hash, telephone, adresse, ville]
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
role: 'patient'
}
});
} catch (err) {
console.error('REGISTER PATIENT ERROR:', err.message);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// INSCRIPTION SOCIETE
router.post('/register-societe', async (req, res) => {
const { nom, email, password, mot_de_passe, telephone, ville, type_transport } = req.body;
const mdp = password || mot_de_passe;
try {
const exist = await pool.query('SELECT * FROM societes WHERE email = $1', [email]);
if (exist.rows.length > 0) {
return res.status(400).json({ error: 'Email déjà utilisé' });
}
const hash = await bcrypt.hash(mdp, 10);
const result = await pool.query(
'INSERT INTO societes (nom, email, mot_de_passe, telephone, actif, ville, type_transport) VALUES ($1, $2, $3, $4, false, $5, $6) RETURNING *',
[nom, email, hash, telephone, ville || '', type_transport || 'VSL']
);
res.json({ success: true, societe: result.rows[0] });
} catch (err) {
console.error('REGISTER ERROR:', err.message);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// INSCRIPTION CHAUFFEUR
router.post('/register-chauffeur', async (req, res) => {
const { nom, email, password, mot_de_passe, telephone, societe_id } = req.body;
const mdp = password || mot_de_passe;
try {
if (!mdp) return res.status(400).json({ error: 'Mot de passe requis' });
const exist = await pool.query('SELECT * FROM chauffeurs WHERE email = $1', [email]);
if (exist.rows.length > 0) {
return res.status(400).json({ error: 'Email déjà utilisé' });
}
const hash = await bcrypt.hash(mdp, 10);
const result = await pool.query(
'INSERT INTO chauffeurs (nom, email, mot_de_passe, telephone, societe_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
[nom, email, hash, telephone, societe_id]
);
res.json({ success: true, chauffeur: result.rows[0] });
} catch (err) {
console.error('REGISTER CHAUFFEUR ERROR:', err.message);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// LISTE CHAUFFEURS de la société connectée
router.get('/chauffeurs', async (req, res) => {
try {
const authHeader = req.headers['authorization'];
const token = authHeader && authHeader.split(' ')[1];
if (!token) return res.status(401).json({ error: 'Token manquant' });
const decoded = jwt.verify(token, process.env.JWT_SECRET || 'TransportConnect2024SecretKey!');
const result = await pool.query(
'SELECT id, nom, email, telephone, societe_id FROM chauffeurs WHERE societe_id = $1',
[decoded.societe_id]
);
res.json(result.rows);
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

// ✅ LISTE SOCIETES pour les patients
router.get('/societes', async (req, res) => {
try {
const result = await pool.query(
'SELECT id, nom, ville, type_transport, telephone FROM societes WHERE actif = true ORDER BY nom'
);
res.json(result.rows);
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

module.exports = router;
