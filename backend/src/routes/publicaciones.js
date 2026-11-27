const express = require('express');
const pool = require('../db');

const router = express.Router();

const MODALIDADES = ['DONACION', 'INTERCAMBIO'];

// Listar publicaciones (opcional: ?estado=DISPONIBLE)
router.get('/', async (req, res, next) => {
  try {
    let sql = `SELECT p.*, u.nombre AS propietario
               FROM publicaciones p
               JOIN usuarios u ON u.id = p.usuario_id`;
    const params = [];
    if (req.query.estado) {
      sql += ' WHERE p.estado = ?';
      params.push(req.query.estado);
    }
    sql += ' ORDER BY p.fecha_publicacion DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// Obtener una publicación
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.nombre AS propietario
       FROM publicaciones p
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ mensaje: 'Publicación no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Crear publicación
// OJO: por ahora usuario_id viene en el body. En la etapa 5 se tomará del token (RN01).
router.post('/', async (req, res, next) => {
  try {
    const { titulo, descripcion, categoria, modalidad, usuario_id } = req.body;
    if (!titulo || !descripcion || !categoria || !modalidad || !usuario_id) {
      return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
    }
    if (!MODALIDADES.includes(modalidad)) {
      return res.status(400).json({ mensaje: 'Modalidad inválida (DONACION o INTERCAMBIO)' });
    }
    const [usr] = await pool.query('SELECT id FROM usuarios WHERE id = ?', [usuario_id]);
    if (usr.length === 0) return res.status(404).json({ mensaje: 'El usuario no existe' });

    const [result] = await pool.query(
      `INSERT INTO publicaciones (titulo, descripcion, categoria, modalidad, usuario_id)
       VALUES (?, ?, ?, ?, ?)`,
      [titulo, descripcion, categoria, modalidad, usuario_id]
    );
    res.status(201).json({ id: result.insertId, estado: 'DISPONIBLE' });
  } catch (err) { next(err); }
});

// Editar publicación (solo si está DISPONIBLE)
router.put('/:id', async (req, res, next) => {
  try {
    const { titulo, descripcion, categoria, modalidad } = req.body;
    if (!titulo || !descripcion || !categoria || !modalidad) {
      return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
    }
    if (!MODALIDADES.includes(modalidad)) {
      return res.status(400).json({ mensaje: 'Modalidad inválida' });
    }
    const [rows] = await pool.query('SELECT estado FROM publicaciones WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ mensaje: 'Publicación no encontrada' });
    if (rows[0].estado !== 'DISPONIBLE') {
      return res.status(409).json({ mensaje: 'Solo se pueden editar publicaciones DISPONIBLES' });
    }
    await pool.query(
      'UPDATE publicaciones SET titulo=?, descripcion=?, categoria=?, modalidad=? WHERE id=?',
      [titulo, descripcion, categoria, modalidad, req.params.id]
    );
    res.json({ mensaje: 'Publicación actualizada' });
  } catch (err) { next(err); }
});

// "Eliminar" = cancelar (RN17). Solo si está DISPONIBLE.
router.delete('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT estado FROM publicaciones WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ mensaje: 'Publicación no encontrada' });
    if (rows[0].estado !== 'DISPONIBLE') {
      return res.status(409).json({ mensaje: 'Solo se pueden cancelar publicaciones DISPONIBLES' });
    }
    await pool.query("UPDATE publicaciones SET estado = 'CANCELADA' WHERE id = ?", [req.params.id]);
    res.json({ mensaje: 'Publicación cancelada' });
  } catch (err) { next(err); }
});

module.exports = router;