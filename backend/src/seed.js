// Crea usuarios de demostración (ejecutar una vez: npm run seed)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

const usuarios = [
  { nombre: 'Administrador', correo: 'admin@reusecampus.cl', password: 'admin123', rol: 'ADMIN' },
  { nombre: 'Ana Propietaria', correo: 'ana@reusecampus.cl', password: 'ana123', rol: 'USUARIO' },
  { nombre: 'Beto Solicitante', correo: 'beto@reusecampus.cl', password: 'beto123', rol: 'USUARIO' },
  { nombre: 'Carla Solicitante', correo: 'carla@reusecampus.cl', password: 'carla123', rol: 'USUARIO' },
];

(async () => {
  for (const u of usuarios) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      'INSERT IGNORE INTO usuarios (nombre, correo, password, rol) VALUES (?, ?, ?, ?)',
      [u.nombre, u.correo, hash, u.rol]);
  }
  console.log('Usuarios de demostración listos');
  await pool.end();
})();
