const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

function authenticateToken(req, res, next) {
const authHeader = req.headers['authorization'];
const token = authHeader && authHeader.split(' ')[1];
if (!token) return res.status(401).json({ error: 'Token manquant' });
jwt.verify(token, process.env.JWT_SECRET || 'TransportConnect2024SecretKey!', (err, user) => {
if (err) return res.status(403).json({ error: 'Token invalide' });
req.user = user;
next();
});
}

app.use(cors({
origin: '*',
methods: ['GET', 'POST', 'PUT', 'DELETE'],
allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const tourRoutes = require('./routes/tours');
const vehicleRoutes = require('./routes/vehicles');
const companyRoutes = require('./routes/company');
const gpsRoutes = require('./routes/gps');

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/tours', tourRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/gps', gpsRoutes);

const pool = require('./db');

// ✅ Colonnes automatiques
pool.query(`ALTER TABLE trajets ADD COLUMN IF NOT EXISTS patient_token VARCHAR(50)`)
.then(() => console.log('Colonne patient_token OK'))
.catch(e => console.log('patient_token:', e.message));

pool.query(`ALTER TABLE societes ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT false`)
.then(() => console.log('Colonne actif OK'))
.catch(e => console.log('actif:', e.message));

pool.query(`UPDATE societes SET actif = true WHERE email = 'societe1@test.fr'`)
.then(() => console.log('societe1 activée'))
.catch(e => console.log('update actif:', e.message));

pool.query(`ALTER TABLE trajets ADD COLUMN IF NOT EXISTS societe_id INTEGER`)
.then(() => console.log('Colonne societe_id trajets OK'))
.catch(e => console.log('societe_id trajets:', e.message));

// ✅ GET trajets du chauffeur connecté
app.get('/api/tours/chauffeur', authenticateToken, async (req, res) => {
try {
const result = await pool.query(
'SELECT * FROM trajets WHERE chauffeur_id = $1 ORDER BY date ASC',
[req.user.id]
);
res.json(result.rows);
} catch (e) {
res.status(500).json({ error: e.message });
}
});

// ✅ PUT modifier un trajet
app.put('/api/tours/:id', authenticateToken, async (req, res) => {
const { chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date } = req.body;
try {
await pool.query(
'UPDATE trajets SET chauffeur_id=$1, patient_id=$2, adresse_depart=$3, adresse_arrivee=$4, date=$5 WHERE id=$6',
[chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, req.params.id]
);
res.json({ success: true });
} catch (e) {
res.status(500).json({ error: e.message });
}
});

// ✅ PUT status trajet
app.put('/api/tours/:id/status', authenticateToken, async (req, res) => {
const { status } = req.body;
try {
await pool.query('UPDATE trajets SET status=$1 WHERE id=$2', [status, req.params.id]);
res.json({ success: true });
} catch (e) {
res.status(500).json({ error: e.message });
}
});

// ✅ GPS position
app.post('/api/gps/position', authenticateToken, async (req, res) => {
const { lat, lng, trajet_id } = req.body;
try {
const message = JSON.stringify({
type: 'position',
chauffeur_id: req.user.id,
trajet_id,
lat,
lng,
timestamp: new Date().toISOString()
});
wss.clients.forEach(client => {
if (client.readyState === 1) client.send(message);
});
res.json({ success: true });
} catch (e) {
res.status(500).json({ error: e.message });
}
});

// ✅ GET liste sociétés pour patients
app.get('/api/societes', authenticateToken, async (req, res) => {
try {
const result = await pool.query(
'SELECT id, nom, ville, type_transport, telephone FROM societes WHERE actif = true ORDER BY nom'
);
res.json(result.rows);
} catch (e) {
res.status(500).json({ error: e.message });
}
});

// ✅ GET demandes pour une société
app.get('/api/demandes', authenticateToken, async (req, res) => {
try {
const result = await pool.query(
'SELECT * FROM demandes WHERE societe_id = $1 ORDER BY created_at DESC',
[req.user.societe_id || req.user.id]
);
res.json(result.rows);
} catch (e) {
res.status(500).json({ error: e.message });
}
});

// ✅ GET demandes pour un patient
app.get('/api/demandes/patient', authenticateToken, async (req, res) => {
try {
const result = await pool.query(
`SELECT d.*, s.nom as nom_societe
FROM demandes d
LEFT JOIN societes s ON d.societe_id = s.id
WHERE d.patient_id = $1
ORDER BY d.created_at DESC`,
[req.user.id]
);
res.json(result.rows);
} catch (e) {
res.status(500).json({ error: e.message });
}
});

// ✅ POST créer une demande (patient)
app.post('/api/demandes', authenticateToken, async (req, res) => {
const { societe_id, adresse_depart, adresse_arrivee, date, patient_nom, patient_telephone } = req.body;
try {
// Récupérer nom société
const societeRes = await pool.query('SELECT nom FROM societes WHERE id = $1', [societe_id]);
const nomSociete = societeRes.rows[0]?.nom || '';

const result = await pool.query(
`INSERT INTO demandes (patient_id, societe_id, patient_nom, patient_telephone, adresse_depart, adresse_arrivee, date, statut, nom_societe)
VALUES ($1, $2, $3, $4, $5, $6, $7, 'en_attente', $8) RETURNING *`,
[req.user.id, societe_id, patient_nom, patient_telephone, adresse_depart, adresse_arrivee, date, nomSociete]
);
res.json(result.rows[0]);
} catch (e) {
res.status(500).json({ error: e.message });
}
});

// ✅ PUT répondre à une demande (société accepte ou refuse)
app.put('/api/demandes/:id/repondre', authenticateToken, async (req, res) => {
const { statut } = req.body;
try {
const demande = await pool.query('SELECT * FROM demandes WHERE id = $1', [req.params.id]);
if (demande.rows.length === 0) return res.status(404).json({ error: 'Demande introuvable' });

await pool.query('UPDATE demandes SET statut = $1 WHERE id = $2', [statut, req.params.id]);

// ✅ Si accepté — créer automatiquement un trajet
if (statut === 'confirme') {
const d = demande.rows[0];
const patient_token = Math.random().toString(36).substring(2, 10).toUpperCase();
await pool.query(
`INSERT INTO trajets (patient_id, adresse_depart, adresse_arrivee, date, status, patient_token, societe_id)
VALUES ($1, $2, $3, $4, 'en_attente', $5, $6)`,
[d.patient_nom, d.adresse_depart, d.adresse_arrivee, d.date, patient_token, d.societe_id]
);
// Mettre à jour le token dans la demande
await pool.query('UPDATE demandes SET patient_token = $1 WHERE id = $2', [patient_token, req.params.id]);
}

res.json({ success: true });
} catch (e) {
res.status(500).json({ error: e.message });
}
});

// ✅ PUT annuler une demande (patient)
app.put('/api/demandes/:id/annuler', authenticateToken, async (req, res) => {
try {
await pool.query('UPDATE demandes SET statut = $1 WHERE id = $2 AND patient_id = $3', ['annule', req.params.id, req.user.id]);
res.json({ success: true });
} catch (e) {
res.status(500).json({ error: e.message });
}
});

const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
console.log(`TransportConnect démarré port ${PORT}`);
});

// ✅ WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
console.log('Client WebSocket connecté');
ws.on('message', (message) => {
try {
const data = JSON.parse(message);
wss.clients.forEach(client => {
if (client !== ws && client.readyState === 1) {
client.send(JSON.stringify(data));
}
});
} catch (e) {
console.log('Erreur message WS:', e.message);
}
});
ws.on('close', () => console.log('Client WebSocket déconnecté'));
});

module.exports = app;
