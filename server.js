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
)`).then(() => {
console.log('Table trajets OK');
return pool.query(`
ALTER TABLE trajets
ADD COLUMN IF NOT EXISTS chauffeur_id INTEGER,
ADD COLUMN IF NOT EXISTS patient_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS adresse_depart VARCHAR(255),
ADD COLUMN IF NOT EXISTS adresse_arrivee VARCHAR(255),
ADD COLUMN IF NOT EXISTS date VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'en_attente'
`);
}).then(() => console.log('Colonnes OK')).catch(e => console.log('Erreur:', e.message));

pool.query(`CREATE TABLE IF NOT EXISTS patients (
id SERIAL PRIMARY KEY,
name VARCHAR(255),
address VARCHAR(255),
token VARCHAR(255) UNIQUE,
status VARCHAR(50) DEFAULT 'en_attente',
heureRdv VARCHAR(50),
societe_id INTEGER
)`).then(() => console.log('Table patients OK')).catch(e => console.log('Erreur patients:', e.message));

pool.query(`CREATE TABLE IF NOT EXISTS societes (
id SERIAL PRIMARY KEY,
nom VARCHAR(255),
email VARCHAR(255) UNIQUE,
password VARCHAR(255),
telephone VARCHAR(50),
role VARCHAR(50) DEFAULT 'societe'
)`).then(() => console.log('Table societes OK')).catch(e => console.log('Erreur societes:', e.message));

pool.query(`CREATE TABLE IF NOT EXISTS chauffeurs (
id SERIAL PRIMARY KEY,
nom VARCHAR(255),
prenom VARCHAR(255),
email VARCHAR(255) UNIQUE,
password VARCHAR(255),
telephone VARCHAR(50),
societe_id INTEGER,
role VARCHAR(50) DEFAULT 'chauffeur'
)`).then(() => console.log('Table chauffeurs OK')).catch(e => console.log('Erreur chauffeurs:', e.message));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(`TransportConnect démarré port ${PORT}`);
});

module.exports = app;
