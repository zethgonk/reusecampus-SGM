-- ReUse Campus - Modelo de datos
DROP DATABASE IF EXISTS reuse_campus;
CREATE DATABASE reuse_campus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE reuse_campus;

-- 1) USUARIOS
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  correo VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,              -- aquí se guardará el hash (bcrypt)
  rol ENUM('USUARIO','ADMIN') NOT NULL DEFAULT 'USUARIO',
  estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO'
);

-- 2) PUBLICACIONES
CREATE TABLE publicaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(150) NOT NULL,
  descripcion TEXT NOT NULL,
  categoria VARCHAR(60) NOT NULL,
  modalidad ENUM('DONACION','INTERCAMBIO') NOT NULL,
  estado ENUM('DISPONIBLE','RESERVADA','ENTREGADA','CANCELADA') NOT NULL DEFAULT 'DISPONIBLE',
  fecha_publicacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT NOT NULL,
  CONSTRAINT fk_pub_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- 3) SOLICITUDES
CREATE TABLE solicitudes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  publicacion_id INT NOT NULL,
  solicitante_id INT NOT NULL,
  mensaje VARCHAR(500) NOT NULL,
  fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('PENDIENTE','ACEPTADA','RECHAZADA','CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
  CONSTRAINT fk_sol_publicacion FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id),
  CONSTRAINT fk_sol_solicitante FOREIGN KEY (solicitante_id) REFERENCES usuarios(id)
);

-- 4) ENTREGAS / INTERCAMBIOS
CREATE TABLE entregas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  publicacion_id INT NOT NULL,
  solicitud_id INT NOT NULL UNIQUE,            -- una solicitud aceptada genera una sola entrega
  propietario_id INT NOT NULL,
  receptor_id INT NOT NULL,
  fecha_acuerdo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_entrega DATETIME NULL,                 -- se llena al completar
  estado ENUM('PENDIENTE','COMPLETADA') NOT NULL DEFAULT 'PENDIENTE',
  CONSTRAINT fk_ent_publicacion FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id),
  CONSTRAINT fk_ent_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
  CONSTRAINT fk_ent_propietario FOREIGN KEY (propietario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_ent_receptor FOREIGN KEY (receptor_id) REFERENCES usuarios(id)
);