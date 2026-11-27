const jwt = require('jsonwebtoken');

// Verifica el token JWT y deja los datos del usuario en req.usuario (RN01, RN18)
function autenticar(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const [tipo, token] = cabecera.split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ mensaje: 'Debes iniciar sesión' });
  }
  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: datos.id, rol: datos.rol, nombre: datos.nombre };
    next();
  } catch (err) {
    return res.status(401).json({ mensaje: 'Sesión inválida o expirada' });
  }
}

// Restringe una ruta a ciertos roles
function requiereRol(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para esta operación' });
    }
    next();
  };
}

module.exports = { autenticar, requiereRol };
