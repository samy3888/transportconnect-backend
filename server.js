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

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const tourRoutes = require('./routes/tours');

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/tours', tourRoutes);

const pool = require('./db');

// ✅ MIGRATIONS AUTO
const colonnes = [
`ALTER TABLE trajets ADD COLUMN IF NOT EXISTS patient_token VARCHAR(50)`,
`ALTER TABLE trajets ADD COLUMN IF NOT EXISTS societe_id INTEGER`,
`ALTER TABLE trajets ADD COLUMN IF NOT EXISTS type_transport VARCHAR(100)`,
`ALTER TABLE trajets ADD COLUMN IF NOT EXISTS mobilite VARCHAR(100)`,
`ALTER TABLE trajets ADD COLUMN IF NOT EXISTS accompagnant BOOLEAN DEFAULT false`,
`ALTER TABLE trajets ADD COLUMN IF NOT EXISTS urgent BOOLEAN DEFAULT false`,
`ALTER TABLE trajets ADD COLUMN IF NOT EXISTS commentaire TEXT`,
`ALTER TABLE trajets ADD COLUMN IF NOT EXISTS patient_telephone VARCHAR(50)`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT false`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS ville VARCHAR(255)`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS type_transport VARCHAR(100)`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS adresse VARCHAR(255)`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS code_postal VARCHAR(20)`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS siret VARCHAR(50)`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS description TEXT`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS nb_vehicules VARCHAR(20)`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false`,
`ALTER TABLE societes ADD COLUMN IF NOT EXISTS telephone VARCHAR(50)`,
`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS societe_id INTEGER`,
`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS prenom VARCHAR(255)`,
`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS telephone VARCHAR(50)`,
`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS disponible BOOLEAN DEFAULT true`,
`ALTER TABLE patients_comptes ADD COLUMN IF NOT EXISTS code_postal VARCHAR(20)`,
`ALTER TABLE patients_comptes ADD COLUMN IF NOT EXISTS date_naissance VARCHAR(50)`,
`ALTER TABLE patients_comptes ADD COLUMN IF NOT EXISTS contact_urgence VARCHAR(255)`,
`ALTER TABLE patients_comptes ADD COLUMN IF NOT EXISTS tel_urgence VARCHAR(50)`,
`ALTER TABLE patients_comptes ADD COLUMN IF NOT EXISTS is_mineur BOOLEAN DEFAULT false`,
`ALTER TABLE patients_comptes ADD COLUMN IF NOT EXISTS nom_parent VARCHAR(255)`,
`ALTER TABLE patients_comptes ADD COLUMN IF NOT EXISTS tel_parent VARCHAR(50)`,
`ALTER TABLE patients_comptes ADD COLUMN IF NOT EXISTS numero_dossier VARCHAR(20)`,
];

colonnes.forEach(sql => {
pool.query(sql).catch(e => console.log('Migration:', e.message));
});

// ✅ ACTIVER SOCIÉTÉ TEST
pool.query(`UPDATE societes SET actif = true, is_admin = true WHERE email = 'societe1@test.fr'`)
.then(() => console.log('societe1 activée admin'))
.catch(e => console.log(e.message));

// ✅ SUPPRIMER ET RECRÉER TABLE DEMANDES
pool.query(`DROP TABLE IF EXISTS demandes`)
.then(() => {
pool.query(`CREATE TABLE demandes (
id SERIAL PRIMARY KEY,
patient_id INTEGER,
societe_id INTEGER,
patient_nom VARCHAR(255),
patient_telephone VARCHAR(50),
adresse_depart VARCHAR(255),
adresse_arrivee VARCHAR(255),
date VARCHAR(255),
statut VARCHAR(50) DEFAULT 'en_attente',
patient_token VARCHAR(50),
nom_societe VARCHAR(255),
type_transport VARCHAR(100),
mobilite VARCHAR(100),
accompagnant BOOLEAN DEFAULT false,
urgent BOOLEAN DEFAULT false,
commentaire TEXT,
created_at TIMESTAMP DEFAULT NOW()
)`).then(() => console.log('Table demandes recréée OK')).catch(e => console.log(e.message));
}).catch(e => console.log(e.message));

// ✅ TABLE PATIENTS COMPTES
pool.query(`CREATE TABLE IF NOT EXISTS patients_comptes (
id SERIAL PRIMARY KEY,
nom VARCHAR(255),
prenom VARCHAR(255),
email VARCHAR(255) UNIQUE,
mot_de_passe VARCHAR(255),
telephone VARCHAR(50),
adresse VARCHAR(255),
ville VARCHAR(255),
code_postal VARCHAR(20),
date_naissance VARCHAR(50),
contact_urgence VARCHAR(255),
tel_urgence VARCHAR(50),
is_mineur BOOLEAN DEFAULT false,
nom_parent VARCHAR(255),
tel_parent VARCHAR(50),
numero_dossier VARCHAR(20),
created_at TIMESTAMP DEFAULT NOW()
)`).then(() => console.log('Table patients_comptes OK')).catch(e => console.log(e.message));

// ===========================
// ROUTES TRAJETS
// ===========================

app.get('/api/tours', authenticateToken, async (req, res) => {
try {
const result = await pool.query(
'SELECT * FROM trajets WHERE societe_id = $1 ORDER BY date ASC',
[req.user.societe_id || req.user.id]
);
res.json(result.rows);
} catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/tours/chauffeur', authenticateToken, async (req, res) => {
try {
const result = await pool.query(
'SELECT * FROM trajets WHERE chauffeur_id = $1 ORDER BY date ASC',
[req.user.id]
);
res.json(result.rows);
} catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tours', authenticateToken, async (req, res) => {
const { chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, type_transport, mobilite, accompagnant, urgent, commentaire, patient_telephone } = req.body;
try {
const patient_token = Math.random().toString(36).substring(2, 10).toUpperCase();
const result = await pool.query(
`INSERT INTO trajets (chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, status, patient_token, societe_id, type_transport, mobilite, accompagnant, urgent, commentaire, patient_telephone)
VALUES ($1, $2, $3, $4, $5, 'en_attente', $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
[chauffeur_id, patient_id, adresse_depart, arrivee, date, patient_token, req.user.societe_id || req.user.id, type_transport, mobilite, accompagnant, urgent, commentaire, patient_telephone]
);
res.json({ success: true, patient_token, tour: result.rows[0] });
} catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tours/:id', authenticateToken, async (req, res) => {
const { chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, urgent, commentaire } = req.body;
try {
await pool.query(
'UPDATE trajets SET chauffeur_id=$1, patient_id=$2, adresse_depart=$3, adresse_arrivee=$4, date=$5, urgent=$6, commentaire=$7 WHERE id=$8',
[chauffeur_id, patient_id, adresse_depart, adresse_arrivee, date, urgent, commentaire, req.params.id]
);
res.json({ success: true });
} catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tours/:id/status', authenticateToken, async (req, res) => {
const { status } = req.body;
try {
await pool.query('UPDATE trajets SET status=$1 WHERE id=$2', [status, req.params.id]);
res.json({ success: true });
} catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tours/:id/refuser', authenticateToken, async (req, res) => {
const { motif } = req.body;
try {
await pool.query('UPDATE trajets SET status=$1, commentaire=$2 WHERE id=$3', ['refuse', motif, req.params.id]);
res.json({ success: true });
} catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/tours/:id', authenticateToken, async (req, res) => {
try {
await pool.query('DELETE FROM trajets WHERE id=$1', [req.params.id]);
res.json({ success: true });
} catch (e) { res.status(500).json({ error: e.message }); }
});

// ===========================
// ROUTES DEMANDES
// ===========================

app.get('/api/demandes', authenticateToken, async (req, res) => {
try {
const result = await pool.query(
'SELECT * FROM demandes WHERE societe_id = $1 ORDER BY created_at DESC',
[req.user.societe_id || req.user.id]
);
res.json(result.rows);
} catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/demandes/patient', authenticateToken, async (req, res) => {
try {
const result = await pool.query(
`SELECT d.*, s.nom as nom_societe, s.telephone as societe_telephone
FROM demandes d
LEFT JOIN societes s ON d.societe_id = s.id
WHERE d.patient_id = $1
ORDER BY d.created_at DESC`,
[req.user.id]
);
res.json(result.rows);
} catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/demandes', authenticateToken, async (req, res) => {
const { societe_id, adresse_depart, adresse_arrivee, date, patient_nom, patient_telephone, type_transport, mobilite, accompagnant, urgent, commentaire } = req.body;
try {
const societeRes = await pool.query('SELECT nom FROM societes WHERE id = $1', [societe_id]);
const nomSociete = societeRes.rows[0]?.nom || '';
const result = await pool.query(
`INSERT INTO demandes (patient_id, societe_id, patient_nom, patient_telephone, adresse_depart, adresse_arrivee, date, statut, nom_societe, type_transport, mobilite, accompagnant, urgent, commentaire)
VALUES ($1, $2, $3, $4, $5, $6, $7, 'en_attente', $8, $9, $10, $11, $12, $13) RETURNING *`,
[req.user.id, societe_id, patient_nom, patient_telephone, adresse_depart, adresse_arrivee, date, nomSociete, type_transport, mobilite, accompagnant, urgent, commentaire]
);
res.json(result.rows[0]);
} catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/demandes/:id/repondre', authenticateToken, async (req, res) => {
const { statut } = req.body;
try {
const demande = await pool.query('SELECT * FROM demandes WHERE id = $1', [req.params.id]);
if (demande.rows.length === 0) return res.status(404).json({ error: 'Demande introuvable' });
await pool.query('UPDATE demandes SET statut = $1 WHERE id = $2', [statut, req.params.id]);
if (statut === 'confirme') {
const d = demande.rows[0];
const patient_token = Math.random().toString(36).substring(2, 10).toUpperCase();
await pool.query(
`INSERT INTO trajets (patient_id, adresse_depart, adresse_arrivee, date, status, patient_token, societe_id, type_transport, mobilite, accompagnant, urgent, commentaire)
VALUES ($1, $2, $3, $4, 'en_attente', $5, $6, $7, $8, $9, $10, $11)`,
[d.patient_nom, d.adresse_depart, d.adresse_arrivee, d.date, patient_token, d.societe_id, d.type_transport, d.mobilite, d.accompagnant, d.urgent, d.commentaire]
);
await pool.query('UPDATE demandes SET patient_token = $1 WHERE id = $2', [patient_token, req.params.id]);
}
res.json({ success: true });
} catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/demandes/:id/annuler', authenticateToken, async (req, res) => {
try {
await pool.query('UPDATE demandes SET statut = $1 WHERE id = $2 AND patient_id = $3', ['annule', req.params.id, req.user.id]);
res.json({ success: true });
} catch (e) { res.status(500).json({ error: e.message }); }
});

// ===========================
// ROUTES SOCIÉTÉS
// ===========================

app.get('/api/societes', authenticateToken, async (req, res) => {
try {
const result = await pool.query(
`SELECT id, nom, ville, code_postal, type_transport, telephone, description, nb_vehicules
FROM societes WHERE actif = true ORDER BY nom`
);
res.json(result.rows);
} catch (e) { res.status(500).json({ error: e.message }); }
});

// ===========================
// ROUTES GPS
// ===========================

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
} catch (e) { res.status(500).json({ error: e.message }); }
});

// ===========================
// ROUTES ADMIN
// ===========================

app.get('/api/admin/societes', authenticateToken, async (req, res) => {
try {
const result = await pool.query('SELECT * FROM societes ORDER BY created_at DESC');
res.json(result.rows);
} catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/passagers', authenticateToken, async (req, res) => {
try {
const result = await pool.query('SELECT id, nom, prenom, email, telephone, ville, created_at FROM patients_comptes ORDER BY created_at DESC');
res.json(result.rows);
} catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/societes/:id/toggle', authenticateToken, async (req, res) => {
const { actif } = req.body;
try {
await pool.query('UPDATE societes SET actif = $1 WHERE id = $2', [actif, req.params.id]);
res.json({ success: true });
} catch (e) { res.status(500).json({ error: e.message }); }
});

// ===========================
// WEBSOCKET
// ===========================

const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
console.log(`🚐 TransportConnect démarré port ${PORT}`);
});

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
} catch (e) { console.log('Erreur WS:', e.message); }
});
ws.on('close', () => console.log('Client WebSocket déconnecté'));
});

module.exports = app;
