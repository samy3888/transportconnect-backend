const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

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
pool.query(`CREATE TABLE IF NOT EXISTS trajets (
id SERIAL PRIMARY KEY,
chauffeur_id INTEGER,
patient_id VARCHAR(255),
adresse_depart VARCHAR(255),
adresse_arrivee VARCHAR(255),
date VARCHAR(255),
status VARCHAR(50) DEFAULT 'en_attente'
)`).then(() => console.log('Table trajets OK')).catch(e => console.log('Erreur table trajets:', e.message));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(`TransportConnect démarré port ${PORT}`);
});

module.exports = app;
