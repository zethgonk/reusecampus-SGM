// Pruebas de integración de la API. Requisitos: BD creada, `npm run seed` ejecutado
// y la API corriendo (npm start). Ejecutar: npm test
const test = require('node:test');
const assert = require('node:assert');

const API = process.env.API_URL || 'http://localhost:3000/api';

async function llamar(metodo, ruta, token, cuerpo) {
  const res = await fetch(API + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* sin cuerpo */ }
  return { status: res.status, data };
}
async function login(correo, password) {
  const r = await llamar('POST', '/auth/login', null, { correo, password });
  assert.strictEqual(r.status, 200, 'login ' + correo);
  return r.data.token;
}

let ana, beto, carla, admin, pubId, solBeto, solCarla, entregaId;

test.before(async () => {
  ana = await login('ana@reusecampus.cl', 'ana123');
  beto = await login('beto@reusecampus.cl', 'beto123');
  carla = await login('carla@reusecampus.cl', 'carla123');
  admin = await login('admin@reusecampus.cl', 'admin123');
});

test('Login: credenciales incorrectas -> 401', async () => {
  const r = await llamar('POST', '/auth/login', null, { correo: 'ana@reusecampus.cl', password: 'mala' });
  assert.strictEqual(r.status, 401);
});

test('RN01/RN18: sin token no se puede publicar -> 401', async () => {
  const r = await llamar('POST', '/publicaciones', null, { titulo: 'x', descripcion: 'x', categoria: 'x', modalidad: 'DONACION' });
  assert.strictEqual(r.status, 401);
});

test('Validación: publicación con datos incompletos -> 400', async () => {
  const r = await llamar('POST', '/publicaciones', ana, { titulo: 'solo título' });
  assert.strictEqual(r.status, 400);
});

test('Ana publica un artículo (RN01, RN02)', async () => {
  const r = await llamar('POST', '/publicaciones', ana,
    { titulo: 'Calculadora científica', descripcion: 'Casio fx-82', categoria: 'Calculadoras', modalidad: 'DONACION' });
  assert.strictEqual(r.status, 201);
  pubId = r.data.id;
});

test('RN03: el propietario no puede solicitar su publicación -> 403', async () => {
  const r = await llamar('POST', '/solicitudes', ana, { publicacion_id: pubId, mensaje: 'la quiero' });
  assert.strictEqual(r.status, 403);
});

test('Recurso inexistente -> 404', async () => {
  const r = await llamar('POST', '/solicitudes', beto, { publicacion_id: 999999, mensaje: 'hola' });
  assert.strictEqual(r.status, 404);
});

test('RN04/RN06: Beto y Carla solicitan la publicación DISPONIBLE', async () => {
  const b = await llamar('POST', '/solicitudes', beto, { publicacion_id: pubId, mensaje: 'La necesito para mi ramo' });
  const c = await llamar('POST', '/solicitudes', carla, { publicacion_id: pubId, mensaje: 'Yo también' });
  assert.strictEqual(b.status, 201);
  assert.strictEqual(c.status, 201);
  solBeto = b.data.id; solCarla = c.data.id;
});

test('RN05: solicitud duplicada pendiente -> 409', async () => {
  const r = await llamar('POST', '/solicitudes', beto, { publicacion_id: pubId, mensaje: 'otra vez' });
  assert.strictEqual(r.status, 409);
});

test('RN07/RN18: quien no es propietario no puede aceptar -> 403', async () => {
  const r = await llamar('PUT', `/solicitudes/${solBeto}/aceptar`, carla);
  assert.strictEqual(r.status, 403);
});

test('RN16: solo el solicitante cancela su solicitud -> 403 a otro usuario', async () => {
  const r = await llamar('PUT', `/solicitudes/${solBeto}/cancelar`, carla);
  assert.strictEqual(r.status, 403);
});

test('RN07-RN11: Ana acepta a Beto; publicación RESERVADA, Carla RECHAZADA, entrega PENDIENTE', async () => {
  const r = await llamar('PUT', `/solicitudes/${solBeto}/aceptar`, ana);
  assert.strictEqual(r.status, 200);
  entregaId = r.data.entrega_id;
  const pub = await llamar('GET', `/publicaciones/${pubId}`, ana);
  assert.strictEqual(pub.data.estado, 'RESERVADA');
  const recibidas = (await llamar('GET', '/solicitudes/recibidas', ana)).data;
  assert.strictEqual(recibidas.find(s => s.id === solBeto).estado, 'ACEPTADA');
  assert.strictEqual(recibidas.find(s => s.id === solCarla).estado, 'RECHAZADA');
  const ents = (await llamar('GET', '/entregas', ana)).data;
  assert.strictEqual(ents.find(e => e.id === entregaId).estado, 'PENDIENTE');
});

test('RN08: no se puede aceptar otra solicitud -> 409', async () => {
  const r = await llamar('PUT', `/solicitudes/${solCarla}/aceptar`, ana);
  assert.strictEqual(r.status, 409);
});

test('RN12: publicación RESERVADA no admite solicitudes -> 409', async () => {
  const r = await llamar('POST', '/solicitudes', admin, { publicacion_id: pubId, mensaje: 'hola' });
  assert.strictEqual(r.status, 409);
});

test('RN16: no se puede cancelar una solicitud ya ACEPTADA -> 409', async () => {
  const r = await llamar('PUT', `/solicitudes/${solBeto}/cancelar`, beto);
  assert.strictEqual(r.status, 409);
});

test('Solo el propietario confirma la entrega -> 403 al receptor', async () => {
  const r = await llamar('PUT', `/entregas/${entregaId}/completar`, beto);
  assert.strictEqual(r.status, 403);
});

test('RN14: Ana completa la entrega; publicación ENTREGADA', async () => {
  const r = await llamar('PUT', `/entregas/${entregaId}/completar`, ana);
  assert.strictEqual(r.status, 200);
  const pub = await llamar('GET', `/publicaciones/${pubId}`, ana);
  assert.strictEqual(pub.data.estado, 'ENTREGADA');
  const ents = (await llamar('GET', '/entregas', beto)).data;
  const e = ents.find(x => x.id === entregaId);
  assert.strictEqual(e.estado, 'COMPLETADA');
  assert.ok(e.fecha_entrega);
});

test('RN15: publicación ENTREGADA no admite solicitudes -> 409', async () => {
  const r = await llamar('POST', '/solicitudes', carla, { publicacion_id: pubId, mensaje: 'tarde' });
  assert.strictEqual(r.status, 409);
});

test('RN16: el solicitante cancela una solicitud PENDIENTE (y se conserva el historial, RN17)', async () => {
  const p = await llamar('POST', '/publicaciones', ana,
    { titulo: 'Libro de Cálculo', descripcion: 'Stewart', categoria: 'Libros', modalidad: 'INTERCAMBIO' });
  const s = await llamar('POST', '/solicitudes', beto, { publicacion_id: p.data.id, mensaje: 'Me interesa' });
  const c = await llamar('PUT', `/solicitudes/${s.data.id}/cancelar`, beto);
  assert.strictEqual(c.status, 200);
  const mias = (await llamar('GET', '/solicitudes/mias', beto)).data;
  assert.strictEqual(mias.find(x => x.id === s.data.id).estado, 'CANCELADA');
});

test('Roles: usuario común no lista usuarios (403); ADMIN sí (200)', async () => {
  assert.strictEqual((await llamar('GET', '/usuarios', beto)).status, 403);
  assert.strictEqual((await llamar('GET', '/usuarios', admin)).status, 200);
});

test('Registro: correo duplicado -> 409; clave corta -> 400', async () => {
  const dup = await llamar('POST', '/usuarios', null, { nombre: 'X', correo: 'ana@reusecampus.cl', password: '123456' });
  assert.strictEqual(dup.status, 409);
  const corta = await llamar('POST', '/usuarios', null, { nombre: 'X', correo: 'x@x.cl', password: '123' });
  assert.strictEqual(corta.status, 400);
});
