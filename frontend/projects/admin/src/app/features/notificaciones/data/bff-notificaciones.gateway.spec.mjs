import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 08 (ADR-0017), PBI-0025 y PBI-0134: el adaptador de la campana se prueba sin DOM, con dobles de `HttpClient`
// y `HttpErrorResponse` (método de `tienda/data/bff-tienda.gateway.spec.mjs`).
const leer = async (ruta) =>
  (await readFile(new URL(ruta, import.meta.url), 'utf8')).replace(/^import [\s\S]*?;$/gm, '');
const dobles = `
export class HttpErrorResponse extends Error {
  constructor({ status }) { super('http ' + status); this.status = status; }
}
export class HttpClient {}
export class HttpHeaders { constructor(valores) { this.valores = valores; } }
const Injectable = () => (clase) => clase;
export const dependencias = new Map();
const inject = (token) => dependencias.get(token);
const firstValueFrom = (peticion) => peticion;
`;
const fuente = [
  dobles,
  await leer('../../sesion/domain/sesion.gateway.ts'),
  await leer('../domain/notificaciones.gateway.ts'),
  await leer('../../../core/bff-http.ts'),
  await leer('./bff-notificaciones.gateway.ts'),
].join('\n');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  dependencias,
  HttpClient,
  HttpErrorResponse,
  BffNotificacionesGateway,
  SesionVencidaError,
  ServicioNoDisponibleError,
} = await import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);

const NOTIFICACIONES = {
  seenAt: null,
  total: 2,
  counts: { orders: 1, complaints: 1, checkoutErrors: 0 },
  items: [],
};
const falla = (status) => Promise.reject(new HttpErrorResponse({ status }));
function montar(respuesta) {
  const llamadas = [];
  dependencias.set(
    HttpClient,
    Object.assign(Object.create(HttpClient.prototype), {
      get: (url, opciones) => (llamadas.push({ metodo: 'GET', url, opciones }), respuesta()),
      put: (url, cuerpo, opciones) => (llamadas.push({ metodo: 'PUT', url, cuerpo, opciones }), respuesta()),
    }),
  );
  return { gateway: new BffNotificacionesGateway(), llamadas };
}
const rechazo = async (promesa) => {
  try {
    await promesa;
  } catch (error) {
    return error;
  }
  assert.fail('debía fallar');
};

test('consultar() pide las notificaciones con el token', async () => {
  const { gateway, llamadas } = montar(() => Promise.resolve(NOTIFICACIONES));
  assert.equal(await gateway.consultar('token-1'), NOTIFICACIONES);
  assert.equal(llamadas[0].url, '/bff/admin/notifications');
  assert.equal(llamadas[0].opciones.headers.valores.authorization, 'Bearer token-1');
});

test('marcarVisto() envía hasta qué pedido se vio', async () => {
  const { gateway, llamadas } = montar(() => Promise.resolve(NOTIFICACIONES));
  await gateway.marcarVisto('2026-11-15T10:00:00.000Z', 'token-1');
  assert.equal(llamadas[0].url, '/bff/admin/notifications/seen');
  assert.deepEqual(llamadas[0].cuerpo, { until: '2026-11-15T10:00:00.000Z' });
});

test('un 401 es sesión vencida y cualquier otro fallo, un error del dominio, no el HttpErrorResponse', async () => {
  assert.ok((await rechazo(montar(() => falla(401)).gateway.consultar('t'))) instanceof SesionVencidaError);
  assert.ok(
    (await rechazo(montar(() => falla(401)).gateway.marcarVisto('x', 't'))) instanceof SesionVencidaError,
  );
  for (const status of [0, 500]) {
    const error = await rechazo(montar(() => falla(status)).gateway.consultar('t'));
    assert.ok(error instanceof ServicioNoDisponibleError, `estado ${status}`);
    assert.ok(!(error instanceof HttpErrorResponse));
  }
});
