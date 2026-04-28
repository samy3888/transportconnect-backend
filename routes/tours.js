const express = require('express');
const router = express.Router();
const pool = require('../db');

// Récupérer tous les trajets
router.get('/', async (req, res) => {
try {
const result = await pool.query('SELECT * FROM trajets ORDER BY date DESC');
res.json(result.rows);
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

// Récupérer les trajets d'un chauffeur
router.get('/chauffeur/:id', async (req, res) => {
try {
const { id } = req.params;
const result = await pool.query('SELECT * FROM trajets WHERE chauffeur_id = $1 ORDER BY date DESC', [id]);
res.json(result.rows);
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

// Créer un nouveau trajet
router.post('/', async (req, res) => {
try {
const { chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, status } = req.body;
const result = await pool.query(
'INSERT INTO trajets (chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
[chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, status || 'en_attente']
);
res.json(result.rows[0]);
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

// Mettre à jour le statut d'un trajet
router.put('/:id/status', async (req, res) => {
try {
const { id } = req.params;
const { status } = req.body;
const result = await pool.query(
'UPDATE trajets SET statut = $1 WHERE id = $2 RETURNING *',
[status, id]
);
res.json(result.rows[0]);
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

// Supprimer un trajet
router.delete('/:id', async (req, res) => {
try {
const { id } = req.params;
await pool.query('DELETE FROM trajets WHERE id = $1', [id]);
res.json({ success: true });
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

module.exports = router;
