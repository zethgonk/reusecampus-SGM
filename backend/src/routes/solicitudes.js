const express = require('express');
const pool = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar); // RN18: todo requiere sesión

// Error de negocio con código HTTP propio
class ErrorNegocio extends Error {
  constructor(status, mensaje) { super(mensaje); this.status = status; }
}

// Ejecuta fn dentro de una transacción (todo o nada)
async function transaccion(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

function manejar(err, res, next) {
  if (err instanceof ErrorNegocio) return res.status(err.status).json({ mensaje: err.message });
  next(err);
}

const SELECT_SOL = `SELECT s.*, p.titulo AS publicacion_titulo, p.estado AS publicacion_estado,
                           p.usuario_id AS propietario_id,
                           up.nombre AS propietario, us.nombre AS solicitante
                    FROM solicitudes s
                    JOIN publicaciones p ON p.id = s.publicacion_id
                    JOIN usuarios up ON up.id = p.usuario_id
                    JOIN usuarios us ON us.id = s.solicitante_id`;

// Solicitudes que yo hice
router.get('/mias', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      SELECT_SOL + ' WHERE s.solicitante_id = ? ORDER BY s.fecha_solicitud DESC', [req.usuario.id]);
    res.json(rows);
  } catch (err) { next(err); }
});

// Solicitudes recibidas en mis publicaciones
router.get('/recibidas', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      SELECT_SOL + ' WHERE p.usuario_id = ? ORDER BY s.fecha_solicitud DESC', [req.usuario.id]);
    res.json(rows);
  } catch (err) { next(err); }
});

// Todas (solo ADMIN, para supervisión)
router.get('/', async (req, res, next) => {
  try {
    if (req.usuario.rol !== 'ADMIN') {
      return res.status(403).json({ mensaje: 'No tienes permisos para esta operación' });
    }
    const [rows] = await pool.query(SELECT_SOL + ' ORDER BY s.fecha_solicitud DESC');
    res.json(rows);
  } catch (err) { next(err); }
});

// Crear solicitud (RN03, RN04, RN05, RN06, RN12, RN15)
router.post('/', async (req, res, next) => {
  try {
    const { publicacion_id, mensaje } = req.body;
    if (!publicacion_id || !mensaje || !String(mensaje).trim()) {
      return res.status(400).json({ mensaje: 'La publicación y el mensaje son obligatorios' });
    }
    if (String(mensaje).length > 500) {
      return res.status(400).json({ mensaje: 'El mensaje no puede superar los 500 caracteres' });
    }
    const id = await transaccion(async (conn) => {
      // Bloquea la fila de la publicación para evitar condiciones de carrera
      const [pubs] = await conn.query('SELECT * FROM publicaciones WHERE id = ? FOR UPDATE', [publicacion_id]);
      if (pubs.length === 0) throw new ErrorNegocio(404, 'Publicación no encontrada');
      const pub = pubs[0];
      if (pub.usuario_id === req.usuario.id) {
        throw new ErrorNegocio(403, 'No puedes solicitar tu propia publicación');           // RN03
      }
      if (pub.estado !== 'DISPONIBLE') {
        throw new ErrorNegocio(409, `La publicación está ${pub.estado} y no admite solicitudes`); // RN04, RN12, RN15
      }
      const [dup] = await conn.query(
        "SELECT id FROM solicitudes WHERE publicacion_id = ? AND solicitante_id = ? AND estado = 'PENDIENTE'",
        [publicacion_id, req.usuario.id]);
      if (dup.length > 0) {
        throw new ErrorNegocio(409, 'Ya tienes una solicitud pendiente sobre esta publicación'); // RN05
      }
      const [r] = await conn.query(
        'INSERT INTO solicitudes (publicacion_id, solicitante_id, mensaje) VALUES (?, ?, ?)',
        [publicacion_id, req.usuario.id, String(mensaje).trim()]);
      return r.insertId;
    });
    res.status(201).json({ id, estado: 'PENDIENTE' });
  } catch (err) { manejar(err, res, next); }
});

// Aceptar solicitud (RN07, RN08, RN09, RN10, RN11)
router.put('/:id/aceptar', async (req, res, next) => {
  try {
    const entregaId = await transaccion(async (conn) => {
      const [sols] = await conn.query('SELECT * FROM solicitudes WHERE id = ?', [req.params.id]);
      if (sols.length === 0) throw new ErrorNegocio(404, 'Solicitud no encontrada');
      const sol = sols[0];
      const [pubs] = await conn.query('SELECT * FROM publicaciones WHERE id = ? FOR UPDATE', [sol.publicacion_id]);
      const pub = pubs[0];
      if (pub.usuario_id !== req.usuario.id) {
        throw new ErrorNegocio(403, 'Solo el propietario puede aceptar solicitudes de su publicación'); // RN07
      }
      // Releer la solicitud ya con la publicación bloqueada
      const [[actual]] = await conn.query('SELECT estado FROM solicitudes WHERE id = ?', [sol.id]);
      if (actual.estado !== 'PENDIENTE') {
        throw new ErrorNegocio(409, `La solicitud ya está ${actual.estado}`);
      }
      if (pub.estado !== 'DISPONIBLE') {
        throw new ErrorNegocio(409, `La publicación está ${pub.estado}; no se puede aceptar`);        // RN08
      }
      await conn.query("UPDATE solicitudes SET estado = 'ACEPTADA' WHERE id = ?", [sol.id]);
      await conn.query("UPDATE publicaciones SET estado = 'RESERVADA' WHERE id = ?", [pub.id]);        // RN09
      await conn.query(
        "UPDATE solicitudes SET estado = 'RECHAZADA' WHERE publicacion_id = ? AND id <> ? AND estado = 'PENDIENTE'",
        [pub.id, sol.id]);                                                                              // RN10
      const [r] = await conn.query(
        'INSERT INTO entregas (publicacion_id, solicitud_id, propietario_id, receptor_id) VALUES (?, ?, ?, ?)',
        [pub.id, sol.id, pub.usuario_id, sol.solicitante_id]);                                          // RN11
      return r.insertId;
    });
    res.json({ mensaje: 'Solicitud aceptada. Publicación reservada', entrega_id: entregaId });
  } catch (err) { manejar(err, res, next); }
});

// Rechazar solicitud (RN07)
router.put('/:id/rechazar', async (req, res, next) => {
  try {
    await transaccion(async (conn) => {
      const [sols] = await conn.query(
        `SELECT s.estado, p.usuario_id AS propietario_id
         FROM solicitudes s JOIN publicaciones p ON p.id = s.publicacion_id
         WHERE s.id = ? FOR UPDATE`, [req.params.id]);
      if (sols.length === 0) throw new ErrorNegocio(404, 'Solicitud no encontrada');
      if (sols[0].propietario_id !== req.usuario.id) {
        throw new ErrorNegocio(403, 'Solo el propietario puede rechazar solicitudes de su publicación');
      }
      if (sols[0].estado !== 'PENDIENTE') {
        throw new ErrorNegocio(409, `La solicitud ya está ${sols[0].estado}`);
      }
      await conn.query("UPDATE solicitudes SET estado = 'RECHAZADA' WHERE id = ?", [req.params.id]);
    });
    res.json({ mensaje: 'Solicitud rechazada' });
  } catch (err) { manejar(err, res, next); }
});

// Cancelar solicitud: solo el solicitante y solo si está PENDIENTE (RN16)
router.put('/:id/cancelar', async (req, res, next) => {
  try {
    await transaccion(async (conn) => {
      const [sols] = await conn.query('SELECT * FROM solicitudes WHERE id = ? FOR UPDATE', [req.params.id]);
      if (sols.length === 0) throw new ErrorNegocio(404, 'Solicitud no encontrada');
      if (sols[0].solicitante_id !== req.usuario.id) {
        throw new ErrorNegocio(403, 'Solo el solicitante puede cancelar su solicitud');
      }
      if (sols[0].estado !== 'PENDIENTE') {
        throw new ErrorNegocio(409, 'Solo se pueden cancelar solicitudes PENDIENTES');
      }
      await conn.query("UPDATE solicitudes SET estado = 'CANCELADA' WHERE id = ?", [req.params.id]);
    });
    res.json({ mensaje: 'Solicitud cancelada' });
  } catch (err) { manejar(err, res, next); }
});

module.exports = router;
