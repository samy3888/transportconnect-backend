const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
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

pool.query(`ALTER TABLE trajets ADD COLUMN IF NOT EXISTS patient_token VARCHAR(50)`)
.then(() => console.log('Colonne patient_token OK'))
.catch(e => console.log('patient_token:', e.message));

pool.query(`ALTER TABLE societes ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT false`)
.then(() => console.log('Colonne actif OK'))
.catch(e => console.log('actif:', e.message));

pool.query(`UPDATE societes SET actif = true WHERE email = 'societe1@test.fr'`)
.then(() => console.log('societe1 activée'))
.catch(e => console.log('update actif:', e.message));

// GET trajets du chauffeur connecté
app.get('/api/tours/chauffeur', authenticateToken, async (req, res) => {
try {
const result = await pool.query(
'SELECT * FROM trajets WHERE chauffeur_id = $1 ORDER BY date DESC',
[req.user.id]
);
res.json(result.rows);
} catch (e) {
res.status(500).json({ error: e.message });
}
});

// PUT modifier un trajet
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

// PUT status trajet chauffeur
app.put('/api/tours/:id/status', authenticateToken, async (req, res) => {
const { status } = req.body;
try {
await pool.query(
'UPDATE trajets SET status=$1 WHERE id=$2',
[status, req.params.id]
);
res.json({ success: true });
} catch (e) {
res.status(500).json({ error: e.message });
}
});

// ✅ GPS : stocker position chauffeur
app.post('/api/gps/position', authenticateToken, async (req, res) => {
const { lat, lng, trajet_id } = req.body;
try {
// Broadcaster la position à tous les clients WebSocket
const message = JSON.stringify({
type: 'position',
chauffeur_id: req.user.id,
trajet_id,
lat,
lng,
timestamp: new Date().toISOString()
});
wss.clients.forEach(client => {
if (client.readyState === 1) {
client.send(message);
}
});
res.json({ success: true });
} catch (e) {
res.status(500).json({ error: e.message });
}
});

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
// Broadcaster à tous les autres clients
wss.clients.forEach(client => {
if (client !== ws && client.readyState === 1) {
client.send(JSON.stringify(data));
}
});
} catch (e) {
console.log('Erreur message WS:', e.message);
}
});

ws.on('close', () => {
console.log('Client WebSocket déconnecté');
});
});

module.exports = app;
