const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// Login: devuelve un token JWT y los datos básicos del usuario
router.post('/login', async (req, res, next) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password) {
      return res.status(400).json({ mensaje: 'Correo y contraseña son obligatorios' });
    }
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
    const usuario = rows[0];
    // Mismo mensaje para correo inexistente y clave errónea (no filtra qué correos existen)
    if (!usuario || !(await bcrypt.compare(password, usuario.password))) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    }
    if (usuario.estado !== 'ACTIVO') {
      return res.status(403).json({ mensaje: 'Tu cuenta está inactiva' });
    }
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
    });
  } catch (err) { next(err); }
});

module.exports = router;
