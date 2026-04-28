const express = require('express');
const router = express.Router();
const pool = require('../db');

// Récupérer tous les patients (depuis trajets)
router.get('/', async (req, res) => {
try {
const result = await pool.query('SELECT * FROM trajets ORDER BY date DESC');
res.json(result.rows);
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

// ✅ Récupérer un trajet par token patient
router.get('/stop/:token', async (req, res) => {
const { token } = req.params;
try {
const result = await pool.query(
'SELECT * FROM trajets WHERE patient_token = $1',
[token]
);
if (result.rows.length === 0) {
return res.status(404).json({ error: 'Code invalide' });
}
const trajet = result.rows[0];
res.json({
token: trajet.patient_token,
name: trajet.patient_id,
address: trajet.adresse_depart,
destination: trajet.adresse_arrivee,
heureRdv: trajet.date,
status: trajet.status,
});
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

// Récupérer un patient par id
router.get('/:id', async (req, res) => {
const { id } = req.params;
try {
const result = await pool.query('SELECT * FROM trajets WHERE id = $1', [id]);
if (result.rows.length === 0) {
return res.status(404).json({ error: 'Patient non trouvé' });
}
res.json(result.rows[0]);
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

// Mettre à jour le statut
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
res.status(500).json({ error: 'Erreur serveur' });
}
});

// ✅ Patient prêt via token
router.put('/stop/:token/ready', async (req, res) => {
const { token } = req.params;
try {
await pool.query(
'UPDATE trajets SET status = $1 WHERE patient_token = $2',
['pret', token]
);
res.json({ success: true });
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

module.exports = router;
