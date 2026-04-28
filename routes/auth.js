const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// ✅ Ajouter colonne societe_id aux chauffeurs automatiquement
pool.query(`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS societe_id INTEGER`)
.then(() => console.log('Colonne societe_id OK'))
.catch(e => console.log('societe_id:', e.message));

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

// Vérifier si compte société actif
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

// INSCRIPTION SOCIETE
router.post('/register-societe', async (req, res) => {
const { nom, email, mot_de_passe, telephone } = req.body;
try {
const exist = await pool.query('SELECT * FROM societes WHERE email = $1', [email]);
if (exist.rows.length > 0) {
return res.status(400).json({ error: 'Email déjà utilisé' });
}
const hash = await bcrypt.hash(mot_de_passe, 10);
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

// ✅ INSCRIPTION CHAUFFEUR avec societe_id
router.post('/register-chauffeur', async (req, res) => {
const { nom, email, mot_de_passe, telephone, societe_id } = req.body;
try {
const exist = await pool.query('SELECT * FROM chauffeurs WHERE email = $1', [email]);
if (exist.rows.length > 0) {
return res.status(400).json({ error: 'Email déjà utilisé' });
}
const hash = await bcrypt.hash(mot_de_passe, 10);
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

// ✅ LISTE CHAUFFEURS de la société connectée uniquement
router.get('/chauffeurs', async (req, res) => {
try {
const authHeader = req.headers['authorization'];
const token = authHeader && authHeader.split(' ')[1];
if (!token) return res.status(401).json({ error: 'Token manquant' });

const jwt2 = require('jsonwebtoken');
const decoded = jwt2.verify(token, process.env.JWT_SECRET || 'TransportConnect2024SecretKey!');

const result = await pool.query(
'SELECT id, nom, email, telephone, societe_id FROM chauffeurs WHERE societe_id = $1',
[decoded.societe_id]
);
res.json(result.rows);
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

module.exports = router;
