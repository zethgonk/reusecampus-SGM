const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { autenticar, requiereRol } = require('../middleware/auth');

const router = express.Router();

// Listar usuarios (sin password) - solo ADMIN
router.get('/', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, correo, rol, estado FROM usuarios'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Un usuario solo puede ver/editar su propia cuenta; el ADMIN cualquiera
function propioOAdmin(req, res, next) {
  if (req.usuario.rol !== 'ADMIN' && String(req.usuario.id) !== req.params.id) {
    return res.status(403).json({ mensaje: 'No tienes permisos para esta operación' });
  }
  next();
}

// Obtener un usuario
router.get('/:id', autenticar, propioOAdmin, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, correo, rol, estado FROM usuarios WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Registrar usuario
router.post('/', async (req, res, next) => {
  try {
    const { nombre, correo, password } = req.body;
    if (!nombre || !correo || !password) {
      return res.status(400).json({ mensaje: 'Nombre, correo y contraseña son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres' });
    }
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, correo, password) VALUES (?, ?, ?)',
      [nombre, correo, hash]
    );
    res.status(201).json({ id: result.insertId, nombre, correo, rol: 'USUARIO', estado: 'ACTIVO' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Ya existe un usuario con ese correo' });
    }
    next(err);
  }
});

// Actualizar nombre y correo
router.put('/:id', autenticar, propioOAdmin, async (req, res, next) => {
  try {
    const { nombre, correo } = req.body;
    if (!nombre || !correo) {
      return res.status(400).json({ mensaje: 'Nombre y correo son obligatorios' });
    }
    const [result] = await pool.query(
      'UPDATE usuarios SET nombre = ?, correo = ? WHERE id = ?',
      [nombre, correo, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario actualizado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Ya existe un usuario con ese correo' });
    }
    next(err);
  }
});

// "Eliminar" = desactivar (no se borra físicamente, RN17) - solo ADMIN
router.delete('/:id', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const [result] = await pool.query(
      "UPDATE usuarios SET estado = 'INACTIVO' WHERE id = ?",
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario desactivado' });
  } catch (err) { next(err); }
});

module.exports = router;