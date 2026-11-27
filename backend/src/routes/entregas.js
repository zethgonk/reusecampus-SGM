const express = require('express');
const pool = require('../db');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

const SELECT_ENT = `SELECT e.*, p.titulo AS publicacion_titulo, p.estado AS publicacion_estado,
                           uo.nombre AS propietario, ur.nombre AS receptor
                    FROM entregas e
                    JOIN publicaciones p ON p.id = e.publicacion_id
                    JOIN usuarios uo ON uo.id = e.propietario_id
                    JOIN usuarios ur ON ur.id = e.receptor_id`;

// Mis entregas (como propietario o receptor). El ADMIN ve todas.
router.get('/', async (req, res, next) => {
  try {
    let sql = SELECT_ENT;
    const params = [];
    if (req.usuario.rol !== 'ADMIN') {
      sql += ' WHERE e.propietario_id = ? OR e.receptor_id = ?';
      params.push(req.usuario.id, req.usuario.id);
    }
    sql += ' ORDER BY e.fecha_acuerdo DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// Confirmar entrega: la entrega pasa a COMPLETADA y la publicación a ENTREGADA (RN14)
router.put('/:id/completar', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ents] = await conn.query('SELECT * FROM entregas WHERE id = ? FOR UPDATE', [req.params.id]);
    if (ents.length === 0) {
      await conn.rollback();
      return res.status(404).json({ mensaje: 'Entrega no encontrada' });
    }
    const ent = ents[0];
    if (ent.propietario_id !== req.usuario.id) {
      await conn.rollback();
      return res.status(403).json({ mensaje: 'Solo el propietario puede confirmar la entrega' });
    }
    if (ent.estado !== 'PENDIENTE') {
      await conn.rollback();
      return res.status(409).json({ mensaje: 'La entrega ya fue completada' });
    }
    await conn.query("UPDATE entregas SET estado = 'COMPLETADA', fecha_entrega = NOW() WHERE id = ?", [ent.id]);
    await conn.query("UPDATE publicaciones SET estado = 'ENTREGADA' WHERE id = ?", [ent.publicacion_id]);
    await conn.commit();
    res.json({ mensaje: 'Entrega completada. Publicación marcada como ENTREGADA' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
