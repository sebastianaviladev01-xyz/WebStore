import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 08 (ADR-0017), PBI-0025 y PBI-0134: un adaptador de `data/` se prueba sin DOM, como una facade: se transpila sin
// sus `import` y `HttpClient`, `HttpErrorResponse` y `firstValueFrom` se sustituyen por dobles. Lo que se comprueba es
// la regla 2 de `frontend/architecture.md`: de `data/` no sale un `HttpErrorResponse`, sino un error del dominio.
const leer = async (ruta) =>
  (await readFile(new URL(ruta, import.meta.url), 'utf8')).replace(/^import [\s\S]*?;$/gm, '');
const dobles = `
export class HttpErrorResponse extends Error {
  constructor({ status, error }) { super('http ' + status); this.status = status; this.error = error; }
}
export class HttpClient {}
export class HttpHeaders { constructor(valores) { this.valores = valores; } }
const Injectable = () => (clase) => clase;
export const dependencias = new Map();
const inject = (token) => dependencias.get(token);
// \`firstValueFrom\` del doble: la «petición» es una promesa ya hecha.
const firstValueFrom = (peticion) => peticion;
`;
const fuente = [
  dobles,
  await leer('../../sesion/domain/sesion.gateway.ts'),
  await leer('../domain/tienda.gateway.ts'),
  await leer('../../../core/bff-http.ts'),
  await leer('./bff-tienda.gateway.ts'),
].join('\n');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  dependencias,
  HttpClient,
  HttpErrorResponse,
  BffTiendaGateway,
  SesionVencidaError,
  ServicioNoDisponibleError,
  SnapshotDesactualizadoError,
  ReglaTiendaError,
} = await import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);

const SNAPSHOT = { revision: 3, products: [], categories: [], brands: [] };
const falla = (status, error) => Promise.reject(new HttpErrorResponse({ status, error }));
/** Adaptador cuyo `HttpClient` responde lo que devuelva `respuesta()` y guarda lo que recibe. */
function montar(respuesta) {
  const llamadas = [];
  const http = Object.assign(Object.create(HttpClient.prototype), {
    get: (url, opciones) => (llamadas.push({ metodo: 'GET', url, opciones }), respuesta()),
    put: (url, cuerpo, opciones) => (llamadas.push({ metodo: 'PUT', url, cuerpo, opciones }), respuesta()),
  });
  dependencias.set(HttpClient, http);
  return { gateway: new BffTiendaGateway(), llamadas };
}
const rechazo = async (promesa) => {
  try {
    await promesa;
  } catch (error) {
    return error;
  }
  assert.fail('debía fallar');
};

test('load() pide el snapshot con el token y devuelve lo que responde el BFF', async () => {
  const { gateway, llamadas } = montar(() => Promise.resolve(SNAPSHOT));
  assert.equal(await gateway.load('token-1'), SNAPSHOT);
  assert.equal(llamadas[0].url, '/bff/admin/snapshot');
  assert.equal(llamadas[0].opciones.headers.valores.authorization, 'Bearer token-1');
});

test('load(): un 401 es sesión vencida y cualquier otro fallo, un error del dominio, no el HttpErrorResponse', async () => {
  assert.ok((await rechazo(montar(() => falla(401)).gateway.load('t'))) instanceof SesionVencidaError);
  for (const status of [0, 500, 503]) {
    const error = await rechazo(montar(() => falla(status)).gateway.load('t'));
    assert.ok(error instanceof ServicioNoDisponibleError, `estado ${status}`);
    assert.ok(!(error instanceof HttpErrorResponse), `estado ${status}: sale un HttpErrorResponse de data/`);
    assert.equal(error.status, status);
  }
});

test('save() traduce los fallos del BFF a errores del dominio', async () => {
  const guardar = (respuesta) => montar(() => respuesta).gateway.save({ revision: 3 }, 't');
  assert.ok(
    (await rechazo(guardar(falla(409, { error: { code: 'STALE_SNAPSHOT' } })))) instanceof
      SnapshotDesactualizadoError,
  );
  assert.ok((await rechazo(guardar(falla(401)))) instanceof SesionVencidaError);
  const grande = await rechazo(guardar(falla(413)));
  assert.ok(grande instanceof ReglaTiendaError);
  assert.match(grande.message, /más de 2 MB/);
  // Lote 27 (PBI-0234): desde el lote 25 solo el logo admite una URL; el mensaje dice lo que sí se puede hacer.
  assert.doesNotMatch(grande.message, /URL/);
  assert.match(grande.message, /vuelve a cargarlas desde su archivo/);
  const regla = await rechazo(guardar(falla(422, { error: { message: 'El SKU ya existe.' } })));
  assert.ok(regla instanceof ReglaTiendaError);
  assert.equal(regla.message, 'El SKU ya existe.');
});

test('save(): un 5xx o un BFF caído no sale como HttpErrorResponse', async () => {
  for (const status of [0, 500]) {
    const error = await rechazo(montar(() => falla(status)).gateway.save({ revision: 3 }, 't'));
    assert.ok(error instanceof ServicioNoDisponibleError, `estado ${status}`);
    assert.ok(!(error instanceof HttpErrorResponse));
  }
});
