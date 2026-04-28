const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// LOGIN
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

// ✅ NOUVEAU : vérifier si compte actif
if (role === 'societe' && user.actif === false) {
return res.status(403).json({ error: 'Compte non activé — contactez TransportConnect' });
}

const valid = await bcrypt.compare(password, user.mot_de_passe);
if (!valid) {
return res.status(400).json({ error: 'Identifiants incorrects' });
}

const token = jwt.sign(
{ id: user.id, role, societe_id: user.societe_id || null },
process.env.JWT_SECRET || 'TransportConnect2024SecretKey!',
{ expiresIn: '7d' }
);

res.json({
success: true,
token,
user: { id: user.id, name: user.nom, email: user.email, role, societe_id: user.societe_id || null }
});
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// INSCRIPTION SOCIETE
router.post('/register-societe', async (req, res) => {
const { nom, email, mot_de_passe, telephone } = req.body;
try {
const exist = await pool.query('SELECT * FROM societes WHERE email = $1', [email]);
if (exist.rows.length > 0) {
return res.status(400).json({ error: 'Email déjà utilisé' });
}
const hash = await bcrypt.hash(mot_de_passe, 10);
// ✅ actif = false par défaut
const result = await pool.query(
'INSERT INTO societes (nom, email, mot_de_passe, telephone, actif) VALUES ($1, $2, $3, $4, false) RETURNING *',
[nom, email, hash, telephone]
);
res.json({ success: true, societe: result.rows[0] });
} catch (err) {
console.error('REGISTER ERROR:', err.message);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// INSCRIPTION CHAUFFEUR
router.post('/register-chauffeur', async (req, res) => {
const { nom, email, mot_de_passe, telephone } = req.body;
try {
const exist = await pool.query('SELECT * FROM chauffeurs WHERE email = $1', [email]);
if (exist.rows.length > 0) {
return res.status(400).json({ error: 'Email déjà utilisé' });
}
const hash = await bcrypt.hash(mot_de_passe, 10);
const result = await pool.query(
'INSERT INTO chauffeurs (nom, email, mot_de_passe, telephone) VALUES ($1, $2, $3, $4) RETURNING *',
[nom, email, hash, telephone]
);
res.json({ success: true, chauffeur: result.rows[0] });
} catch (err) {
console.error('REGISTER CHAUFFEUR ERROR:', err.message);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// LISTE CHAUFFEURS
router.get('/chauffeurs', async (req, res) => {
try {
const result = await pool.query('SELECT id, nom, email, telephone FROM chauffeurs');
res.json(result.rows);
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

module.exports = router;
