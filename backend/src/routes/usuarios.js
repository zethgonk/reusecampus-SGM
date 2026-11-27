const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const router = express.Router();

// Listar usuarios (sin password)
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, correo, rol, estado FROM usuarios'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Obtener un usuario
router.get('/:id', async (req, res, next) => {
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
router.put('/:id', async (req, res, next) => {
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

// "Eliminar" = desactivar (no se borra físicamente, RN17)
router.delete('/:id', async (req, res, next) => {
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