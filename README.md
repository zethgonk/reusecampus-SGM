# ReUse Campus – Plataforma de reutilización e intercambio

Proyecto de la evaluación integradora del **Electivo Angular** (Instituto Profesional Virginio Gómez, Sede Chillán, Ingeniería en Informática).

**Autor:** Sebastián González Maturana

## Descripción
Plataforma de economía circular para una comunidad educativa. Los usuarios publican artículos que ya no usan (para donar o intercambiar), otros usuarios los solicitan y el propietario decide a quién se los entrega. El sistema controla los estados desde la publicación hasta la entrega y conserva el historial.

## Tecnologías
- **Frontend:** Angular 22 (componentes standalone, signals, `HttpClient`, interceptor, guards)
- **Backend:** Node.js + Express 5, JWT (`jsonwebtoken`), `bcryptjs`
- **Base de datos:** MySQL / MariaDB (`mysql2`)

## Requisitos
- Node.js 20 o superior
- MySQL 8 o MariaDB 10.5+

## Instalación y ejecución
```bash
# 1) Base de datos (crea reuse_campus y las 4 tablas)
mysql -u root -p < db/schema.sql

# 2) Backend
cd backend
cp .env.example .env      # editar credenciales de MySQL y JWT_SECRET
npm install
npm run seed              # crea usuarios de demostración
npm start                 # API en http://localhost:3000

# 3) Frontend (otra terminal)
cd frontend
npm install
npm start                 # http://localhost:4200
```

### Usuarios de demostración (`npm run seed`)
| Rol | Correo | Contraseña |
|---|---|---|
| ADMIN | admin@reusecampus.cl | admin123 |
| USUARIO | ana@reusecampus.cl | ana123 |
| USUARIO | beto@reusecampus.cl | beto123 |
| USUARIO | carla@reusecampus.cl | carla123 |

## Base de datos
Cuatro entidades relacionadas con claves primarias y foráneas (`db/schema.sql`):
`usuarios` 1—N `publicaciones` 1—N `solicitudes` 1—1 `entregas`.
`entregas` referencia publicación, solicitud, propietario y receptor. `entregas.solicitud_id` es `UNIQUE`.

## Estructura
```
db/schema.sql              Modelo de datos
backend/src/server.js      Servidor Express
backend/src/middleware/    Autenticación JWT y roles
backend/src/routes/        auth, usuarios, publicaciones, solicitudes, entregas
backend/src/seed.js        Usuarios de demostración
backend/test/              Pruebas de integración de la API
frontend/src/app/core/     Servicios (API, auth, avisos), interceptor, guards
frontend/src/app/pages/    Login, catálogo, mis publicaciones, mis solicitudes, entregas, administración
```

## Funcionalidades
- Registro, login (JWT) y roles USUARIO / ADMIN; rutas protegidas en Angular (guards) y en el backend.
- CRUD de usuarios (la baja es lógica: estado INACTIVO), publicaciones (la baja es CANCELADA), solicitudes y entregas.
- Flujo completo: publicar → solicitar → aceptar (publicación RESERVADA, otras solicitudes RECHAZADAS, entrega PENDIENTE) → confirmar entrega (COMPLETADA, publicación ENTREGADA).
- Aceptar solicitud y completar entrega se ejecutan en **transacciones** con bloqueo de fila (`SELECT ... FOR UPDATE`).
- Mensajes de error comprensibles, incluido el caso de API caída.

### Reglas de negocio y dónde se implementan
| Regla | Archivo |
|---|---|
| RN01, RN02, RN18 (autenticación; propietario tomado del token) | `middleware/auth.js`, `routes/publicaciones.js` |
| RN03, RN04, RN05, RN06, RN12, RN15 (crear solicitud) | `routes/solicitudes.js` → `POST /` |
| RN07, RN08, RN09, RN10, RN11 (aceptar) | `routes/solicitudes.js` → `PUT /:id/aceptar` |
| RN16 (cancelar solo PENDIENTE y solo el solicitante) | `routes/solicitudes.js` → `PUT /:id/cancelar` |
| RN13, RN14 (cierre de entrega; no hay ruta que pase DISPONIBLE→ENTREGADA) | `routes/entregas.js` → `PUT /:id/completar` |
| RN17 (historial: se usan estados, no `DELETE`) | `usuarios.js`, `publicaciones.js` |

### API principal
`POST /api/auth/login` · `POST /api/usuarios` (registro) · `GET/POST /api/publicaciones` · `PUT/DELETE /api/publicaciones/:id` · `POST /api/solicitudes` · `GET /api/solicitudes/mias|recibidas` · `PUT /api/solicitudes/:id/aceptar|rechazar|cancelar` · `GET /api/entregas` · `PUT /api/entregas/:id/completar`

Códigos usados: 200, 201, 400 (datos inválidos), 401 (sin sesión), 403 (sin permiso), 404 (no existe), 409 (conflicto de estado/regla), 500.

## Pruebas realizadas
Con la API en ejecución: `cd backend && npm test` (20 pruebas de integración con `node:test`). Cubren el flujo completo y los errores: login incorrecto, sin token, datos incompletos, solicitar publicación propia, solicitud duplicada, solicitar RESERVADA/ENTREGADA, aceptar sin ser propietario, doble aceptación, cancelar solicitud ya aceptada, confirmar entrega sin permiso, recurso inexistente, roles (ADMIN vs USUARIO) y registro duplicado.

Pruebas manuales en el navegador: login con error, catálogo, mis publicaciones, y persistencia de datos tras recargar la página.

## Declaración de uso de inteligencia artificial

- **Herramienta:** Claude (Anthropic).
- **Tareas con apoyo de IA:** completar el backend (autenticación JWT, middleware de roles, rutas de solicitudes y entregas con transacciones), pruebas de integración, la aplicación Angular (servicios, interceptor, guards, páginas) y este README.
- **Partes generadas o propuestas por IA:** el código de `backend/src/middleware`, `routes/auth.js`, `routes/solicitudes.js`, `routes/entregas.js`, `backend/test/` y `frontend/src/`. El modelo de datos, el CRUD de usuarios y publicaciones y la configuración inicial fueron desarrollados por el autor.
- **Modificaciones del estudiante:** _(describir qué revisaste, cambiaste o corregiste)_.
- **Verificación:** ejecución de `npm test`, ejecución del flujo completo en la interfaz y revisión del estado en la base de datos. _(agrega lo que hayas verificado tú)_.
- Durante la interrogación no se utiliza IA.
