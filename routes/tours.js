const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Fonction pour décoder le token
function getUser(req) {
try {
const authHeader = req.headers['authorization'];
const token = authHeader && authHeader.split(' ')[1];
if (!token) return null;
return jwt.verify(token, process.env.JWT_SECRET || 'TransportConnect2024SecretKey!');
} catch (e) {
return null;
}
}

// ✅ Ajouter colonne societe_id aux trajets
pool.query(`ALTER TABLE trajets ADD COLUMN IF NOT EXISTS societe_id INTEGER`)
.then(() => console.log('Colonne societe_id trajets OK'))
.catch(e => console.log('societe_id trajets:', e.message));

// GET tous les trajets de la société connectée
router.get('/', async (req, res) => {
try {
const user = getUser(req);
if (!user) return res.status(401).json({ error: 'Non autorisé' });

let result;
if (user.role === 'societe') {
// Société voit ses propres trajets
result = await pool.query(
'SELECT * FROM trajets WHERE societe_id = $1 ORDER BY date DESC',
[user.id]
);
} else {
// Chauffeur voit les trajets de sa société
result = await pool.query(
'SELECT * FROM trajets WHERE societe_id = $1 ORDER BY date DESC',
[user.societe_id]
);
}
res.json(result.rows);
} catch (err) {
console.log(err);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// ✅ GET trajets du chauffeur connecté uniquement
router.get('/chauffeur', async (req, res) => {
try {
const user = getUser(req);
if (!user) return res.status(401).json({ error: 'Non autorisé' });

const result = await pool.query(
'SELECT * FROM trajets WHERE chauffeur_id = $1 AND societe_id = $2 ORDER BY date DESC',
[user.id, user.societe_id]
);
res.json(result.rows);
} catch (err) {
console.log(err);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// ✅ Créer un trajet avec societe_id automatique
router.post('/', async (req, res) => {
try {
const user = getUser(req);
if (!user) return res.status(401).json({ error: 'Non autorisé' });

const { chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, status } = req.body;
const patient_token = Math.random().toString(36).substring(2, 10).toUpperCase();

const result = await pool.query(
'INSERT INTO trajets (chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, status, patient_token, societe_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
[chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, status || 'en_attente', patient_token, user.id]
);
res.json(result.rows[0]);
} catch (err) {
console.log(err);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// Mettre à jour le statut d'un trajet
router.put('/:id/status', async (req, res) => {
const { id } = req.params;
const { status } = req.body;
try {
const result = await pool.query(
'UPDATE trajets SET status = $1 WHERE id = $2 RETURNING *',
[status, id]
);
res.json(result.rows[0]);
} catch (err) {
console.log(err);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// Modifier un trajet
router.put('/:id', async (req, res) => {
const { id } = req.params;
const { chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, status } = req.body;
try {
const result = await pool.query(
'UPDATE trajets SET chauffeur_id=$1, patient_id=$2, adresse_depart=$3, adresse_arrivee=$4, date=$5, status=$6 WHERE id=$7 RETURNING *',
[chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, status, id]
);
res.json(result.rows[0]);
} catch (err) {
console.log(err);
res.status(500).json({ error: 'Erreur serveur' });
}
});

// Supprimer un trajet
router.delete('/:id', async (req, res) => {
const { id } = req.params;
try {
await pool.query('DELETE FROM trajets WHERE id = $1', [id]);
res.json({ success: true });
} catch (err) {
console.log(err);
res.status(500).json({ error: 'Erreur serveur' });
}
});

module.exports = router;
