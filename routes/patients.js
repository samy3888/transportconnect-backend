const express = require('express');
const router = express.Router();
const pool = require('../db');

// Récupérer tous les patients
router.get('/', async (req, res) => {
try {
const result = await pool.query('SELECT * FROM patients');
res.json(result.rows);
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

// Récupérer un patient par id
router.get('/:id', async (req, res) => {
try {
const { id } = req.params;
const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
if (result.rows.length === 0) {
return res.status(404).json({ error: 'Patient non trouvé' });
}
res.json(result.rows[0]);
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

// Mettre à jour le statut d'un patient
router.put('/:id/status', async (req, res) => {
try {
const { id } = req.params;
const { status } = req.body;
const result = await pool.query(
'UPDATE patients SET statut = $1 WHERE id = $2 RETURNING *',
[status, id]
);
res.json(result.rows[0]);
} catch (err) {
res.status(500).json({ error: 'Erreur serveur' });
}
});

module.exports = router;