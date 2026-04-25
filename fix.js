require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcrypt');

bcrypt.hash('Test1234', 10).then(h => {
pool.query('UPDATE chauffeurs SET mot_de_passe = $1 WHERE email = $2', [h, 'chauffeur@test.fr'])
.then(r => {
console.log('OK - lignes mises à jour:', r.rowCount);
process.exit();
});
}).catch(e => console.log('ERROR', e.message));