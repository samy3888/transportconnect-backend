const express = require('express');
const router = express.Router();
const pool = require('../db');

// Récupérer tous les trajets
router.get('/', async (req, res) => {
try {
const result = await pool.query('SELECT * FROM trajets ORDER BY date DESC');
res.json(result.rows);
} catch (err) {
console.log(err);
res.status(500).json({ error: err.message });
}
});

// Récupérer les trajets d'un chauffeur
router.get('/chauffeur/:id', async (req, res) => {
const { id } = req.params;
try {
const result = await pool.query('SELECT * FROM trajets WHERE chauffeur_id = $1 ORDER BY date DESC', [id]);
res.json(result.rows);
} catch (err) {
console.log(err);
res.status(500).json({ error: err.message });
}
});

// ✅ Créer un nouveau trajet AVEC token patient
router.post('/', async (req, res) => {
const { chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, status } = req.body;
try {
// ✅ Générer token patient 8 caractères
const patient_token = Math.random().toString(36).substring(2, 10).toUpperCase();

const result = await pool.query(
'INSERT INTO trajets (chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, status, patient_token) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
[chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, status || 'en_attente', patient_token]
);
res.json(result.rows[0]);
} catch (err) {
console.log(err);
res.status(500).json({ error: err.message });
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
res.status(500).json({ error: err.message });
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
res.status(500).json({ error: err.message });
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
res.status(500).json({ error: err.message });
}
});

module.exports = router;
