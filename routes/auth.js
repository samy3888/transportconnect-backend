const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db');

router.post('/login', async (req, res) => {
try {
const { email, password } = req.body;

let result = await pool.query('SELECT * FROM chauffeurs WHERE email = $1', [email]);
let role = null;

if (result.rows.length === 0) {
result = await pool.query('SELECT * FROM societes WHERE email = $1', [email]);
role = 'societe';
}

if (result.rows.length === 0) {
return res.status(400).json({ error: 'Identifiants incorrects' });
}

const user = result.rows[0];
const valid = await bcrypt.compare(password, user.mot_de_passe);
if (!valid) return res.status(400).json({ error: 'Identifiants incorrects' });

const token = jwt.sign(
{ id: user.id },
process.env.JWT_SECRET || 'transportconnect_secret_2024'
);
res.json({
token,
user: {
id: user.id,
name: user.nom || '',
role: role,
companyId: user.societe_id || null
}
});
} catch (err) {
console.error('AUTH ERROR:', err.message);
res.status(500).json({ error: 'Erreur serveur' });
}
});

router.post('/register-societe', async (req, res) => {
try {
const { nom, email, password, telephone } = req.body;

// Vérifier si email déjà utilisé
const exist = await pool.query(
'SELECT * FROM societes WHERE email = $1', [email]
);
if (exist.rows.length > 0) {
return res.status(400).json({ error: 'Email déjà utilisé' });
}

const hash = await bcrypt.hash(password, 10);

const result = await pool.query(
'INSERT INTO societes (nom, email, mot_de_passe, telephone) VALUES ($1, $2, $3, $4) RETURNING *',
[nom, email, hash, telephone]
);

res.json({ success: true, societe: result.rows[0] });
} catch (err) {
console.error('REGISTER ERROR:', err.message);
res.status(500).json({ error: 'Erreur serveur' });
}
router.post('/register-chauffeur', async (req, res) => {
try {
const { nom, email, password, telephone } = req.body;

const exist = await pool.query(
'SELECT * FROM chauffeurs WHERE email = $1', [email]
);
if (exist.rows.length > 0) {
return res.status(400).json({ error: 'Email déjà utilisé' });
}

const hash = await bcrypt.hash(password, 10);

const result = await pool.query(
'INSERT INTO chauffeurs (nom, email, mot_de_passe, telephone) VALUES ($1, $2, $3, $4) RETURNING *',
[nom, email, hash, telephone]
);

res.json({ success: true, chauffeur: result.rows[0] });
} catch (err) {
console.error('REGISTER CHAUFFEUR ERROR:', err.message);
res.status(500).json({ error: 'Erreur serveur' });
}
});});module.exports = router;
