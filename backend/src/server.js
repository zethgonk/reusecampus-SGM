require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

// Ruta de prueba: verifica que la API y la BD funcionan
app.get('/api/salud', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, mensaje: 'API y base de datos funcionando' });
  } catch (err) {
    console.error('Error de BD:', err.code, '-', err.message);
    res.status(500).json({ ok: false, mensaje: 'No hay conexión con la base de datos' });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/publicaciones', require('./routes/publicaciones'));
app.use('/api/solicitudes', require('./routes/solicitudes'));
app.use('/api/entregas', require('./routes/entregas'));

// Ruta inexistente
app.use((req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// Manejo general de errores
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ mensaje: 'El cuerpo de la solicitud no es un JSON válido' });
  }
  console.error(err);
  res.status(500).json({ mensaje: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API ReUse Campus en http://localhost:${PORT}`));