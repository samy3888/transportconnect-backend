const router = require('express').Router();

router.get('/dashboard', (req, res) => {
res.json({
totalVehicles: 4,
activeVehicles: 3,
totalPatients: 6,
completedToday: 2,
delayed: 2,
generatedAt: new Date().toISOString(),
});
});

router.get('/history', (req, res) => {
res.json([
{ time: '07:15', event: 'VSL-69-07 démarre la tournée', type: 'info' },
{ time: '07:42', event: 'Jean Martin — Pris en charge', type: 'success' },
{ time: '08:05', event: 'AMB-38-01 — Retard signalé (+8 min)', type: 'warning' },
{ time: '08:30', event: 'Marie Dupont — Prise en charge confirmée', type: 'success' },
{ time: '08:51', event: 'VSL-38-04 — Arrivé au CHU', type: 'success' },
{ time: '09:10', event: 'Sylvie Bernard — À bord AMB-38-01', type: 'info' },
]);
});

module.exports = router;