const router = require('express').Router();

const vehicles = [
{ id: '1', plate: 'AB-123-CD', code: 'AMB-38-01', type: 'ambulance', driver: 'Pierre Moreau', status: 'en_route', patients: 2, delay: 0, lat: 45.18, lng: 5.72 },
{ id: '2', plate: 'EF-456-GH', code: 'VSL-38-04', type: 'vsl', driver: 'Sophie Leclerc', status: 'onsite', patients: 1, delay: 5, lat: 45.19, lng: 5.74 },
{ id: '3', plate: 'IJ-789-KL', code: 'AMB-69-02', type: 'ambulance', driver: 'Marc Petit', status: 'available', patients: 0, delay: 0, lat: 45.75, lng: 4.83 },
{ id: '4', plate: 'MN-012-OP', code: 'VSL-69-07', type: 'vsl', driver: 'Laura Simon', status: 'en_route', patients: 3, delay: 12, lat: 45.76, lng: 4.85 },
];

router.get('/', (req, res) => res.json(vehicles));
router.get('/:id', (req, res) => {
const v = vehicles.find(v => v.id === req.params.id);
if (!v) return res.status(404).json({ error: 'Véhicule non trouvé' });
res.json(v);
});
router.put('/:id/position', (req, res) => {
const v = vehicles.find(v => v.id === req.params.id);
if (!v) return res.status(404).json({ error: 'Non trouvé' });
const { lat, lng } = req.body;
v.lat = lat;
v.lng = lng;
res.json({ ok: true });
});

module.exports = router;