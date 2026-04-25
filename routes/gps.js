const router = require('express').Router();

const positions = {};

router.post('/position', (req, res) => {
const { vehicleId, lat, lng, speed, tourId, companyId } = req.body;
positions[vehicleId] = { lat, lng, speed, updatedAt: new Date() };
const io = req.app.get('io');
if (io) {
io.to(`tour:${tourId}`).emit('vehicle:position', { vehicleId, lat, lng, speed });
io.to(`company:${companyId}`).emit('vehicle:position', { vehicleId, lat, lng, speed });
}
res.json({ ok: true });
});

router.get('/position/:vehicleId', (req, res) => {
const pos = positions[req.params.vehicleId];
if (!pos) return res.status(404).json({ error: 'Position non trouvée' });
res.json(pos);
});

module.exports = router;
