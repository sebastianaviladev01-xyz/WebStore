import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 08, PBI-0160: la campana se pone al día sola, al volver a la pestaña y cada minuto mientras está visible,
// sin consultar con la pestaña oculta ni con el menú abierto. Es el método de `tienda.facade.spec.mjs`: la facade se
// transpila sin sus `import` y Angular, la sesión y el documento se sustituyen por dobles (PBI-0025, sin entorno DOM).
const leer = async (ruta) =>
  (await readFile(new URL(ruta, import.meta.url), 'utf8')).replace(/^import [\s\S]*?;$/gm, '');
const dobles = `
const signal = (inicial) => {
  let valor = inicial;
  const leer = () => valor;
  leer.set = (nuevo) => { valor = nuevo; };
  leer.update = (cambiar) => { valor = cambiar(valor); };
  return leer;
};
const computed = (calcular) => () => calcular();
const Injectable = () => (clase) => clase;
export class SesionFacade {}
export const DOCUMENT = Symbol('DOCUMENT');
export const dependencias = new Map();
const inject = (token) => dependencias.get(token);
`;
const fuente = [
  dobles,
  await leer('../../sesion/domain/sesion.gateway.ts'),
  await leer('../domain/notificacion.rules.ts'),
  await leer('../domain/notificaciones.gateway.ts'),
  await leer('./notificaciones.facade.ts'),
].join('\n');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  dependencias,
  DOCUMENT,
  SesionFacade,
  NotificacionesFacade,
  NotificacionesGateway,
  INTERVALO_DE_ACTUALIZACION_MS,
} = await import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);

const pedido = (id, at) => ({ type: 'order', id, at, customer: 'Cliente', total: 100 });
const reclamo = (id, at) => ({ type: 'complaint', id, at, complaintType: 'reclamo' });
const NUEVOS = {
  seenAt: null,
  total: 2,
  counts: { orders: 1, complaints: 1, checkoutErrors: 0 },
  items: [reclamo('RC-2026-000001', '2026-11-15T11:00:00.000Z'), pedido('WS-1', '2026-11-15T10:00:00.000Z')],
};

/** Facade con un gateway que cuenta consultas, un documento con visibilidad y un reloj que se mueve a mano. */
function montar({ puede = true, permisos = null } = {}) {
  const consultas = [];
  const vistos = [];
  const gateway = Object.assign(Object.create(NotificacionesGateway.prototype), {
    consultar: async () => {
      consultas.push('consultar');
      return NUEVOS;
    },
    marcarVisto: async (hasta) => {
      vistos.push(hasta);
      return { ...NUEVOS, seenAt: hasta, total: 0, counts: { orders: 0, complaints: 0, checkoutErrors: 0 } };
    },
  });
  const sesion = Object.assign(Object.create(SesionFacade.prototype), {
    can: (permiso) => (permisos ? permisos.includes(permiso) : puede),
    requireToken: () => 'token',
    expirar: () => {},
  });
  const escuchas = new Set();
  const reloj = { funcion: null, ms: null, limpiado: false };
  const documento = {
    visibilityState: 'visible',
    addEventListener: (tipo, funcion) => tipo === 'visibilitychange' && escuchas.add(funcion),
    removeEventListener: (tipo, funcion) => tipo === 'visibilitychange' && escuchas.delete(funcion),
    defaultView: {
      setInterval: (funcion, ms) => {
        reloj.funcion = funcion;
        reloj.ms = ms;
        return 7;
      },
      clearInterval: (id) => id === 7 && (reloj.limpiado = true),
    },
  };
  dependencias.set(NotificacionesGateway, gateway);
  dependencias.set(SesionFacade, sesion);
  dependencias.set(DOCUMENT, documento);
  const facade = new NotificacionesFacade();
  const cambiarVisibilidad = (estado) => {
    documento.visibilityState = estado;
    for (const escucha of escuchas) escucha();
  };
  const esperar = () => new Promise((resolver) => setImmediate(resolver));
  return { facade, consultas, vistos, documento, reloj, escuchas, cambiarVisibilidad, esperar };
}

test('cada minuto, con la pestaña visible, la campana consulta al BFF', async () => {
  const { facade, consultas, reloj, esperar } = montar();
  facade.iniciarActualizacion();
  assert.equal(reloj.ms, INTERVALO_DE_ACTUALIZACION_MS);
  assert.equal(INTERVALO_DE_ACTUALIZACION_MS, 60_000);
  assert.equal(consultas.length, 0, 'no consulta al iniciar: de eso se encarga el layout al entrar');
  reloj.funcion();
  await esperar();
  assert.equal(consultas.length, 1);
  assert.equal(facade.total(), 2);
  reloj.funcion();
  await esperar();
  assert.equal(consultas.length, 2);
});

test('con la pestaña oculta no consulta: ni cada minuto ni al cambiar la visibilidad a oculta', async () => {
  const { facade, consultas, reloj, cambiarVisibilidad, esperar } = montar();
  facade.iniciarActualizacion();
  cambiarVisibilidad('hidden');
  reloj.funcion();
  await esperar();
  assert.equal(consultas.length, 0);
});

test('al volver a la pestaña consulta enseguida, sin esperar al minuto', async () => {
  const { facade, consultas, cambiarVisibilidad, esperar } = montar();
  facade.iniciarActualizacion();
  cambiarVisibilidad('hidden');
  cambiarVisibilidad('visible');
  await esperar();
  assert.equal(consultas.length, 1);
});

test('con el menú abierto no cambia la lista que la persona está viendo', async () => {
  const { facade, consultas, reloj, esperar } = montar();
  await facade.consultar();
  facade.iniciarActualizacion();
  await facade.marcarVisto();
  const antes = consultas.length;
  reloj.funcion();
  await esperar();
  assert.equal(consultas.length, antes, 'abierto el menú, el minuto no consulta');
  await facade.alCerrar();
  assert.equal(consultas.length, antes + 1, 'al cerrar sí se pone al día');
  reloj.funcion();
  await esperar();
  assert.equal(consultas.length, antes + 2, 'cerrado el menú, vuelve a consultar cada minuto');
});

test('sin el permiso de pedidos no consulta nunca', async () => {
  const { facade, consultas, reloj, cambiarVisibilidad, esperar } = montar({ puede: false });
  facade.iniciarActualizacion();
  reloj.funcion();
  cambiarVisibilidad('visible');
  await esperar();
  assert.equal(consultas.length, 0);
});

test('al detenerla se quitan el temporizador y la escucha, y no queda nada vivo', async () => {
  const { facade, consultas, reloj, escuchas, documento, cambiarVisibilidad, esperar } = montar();
  const detener = facade.iniciarActualizacion();
  assert.equal(escuchas.size, 1);
  detener();
  assert.equal(reloj.limpiado, true);
  assert.equal(escuchas.size, 0);
  documento.visibilityState = 'visible';
  cambiarVisibilidad('visible');
  await esperar();
  assert.equal(consultas.length, 0);
});

// Lote 13 (ADR-0021), PBI-0173: avisos de pedidos, reclamos y errores de compra.

test('PBI-0173: al abrir el menú marca «visto» hasta el aviso más reciente, de cualquier tipo, y la lista se queda', async () => {
  const { facade, vistos } = montar();
  await facade.consultar();
  assert.deepEqual(
    facade.avisos().map((aviso) => aviso.id),
    ['RC-2026-000001', 'WS-1'],
  );
  await facade.marcarVisto();
  assert.deepEqual(vistos, ['2026-11-15T11:00:00.000Z']);
  assert.equal(facade.total(), 0, 'el número pasa a lo que queda sin ver');
  assert.deepEqual(facade.conteo(), { orders: 0, complaints: 0, checkoutErrors: 0 });
  assert.equal(facade.avisos().length, 2, 'con el menú abierto la lista no cambia');
});

test('PBI-0173: quien gestiona Reclamaciones sin ver pedidos también tiene campana', async () => {
  const { facade, consultas } = montar({ permisos: ['complaints.manage'] });
  assert.equal(facade.disponible(), true);
  await facade.consultar();
  assert.equal(consultas.length, 1);
  const sinNada = montar({ permisos: ['products.edit'] });
  assert.equal(sinNada.facade.disponible(), false);
});
