import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 40 (ADR-0032), PBI-0257: `current()` distingue la sesión que ya no vale (`401`) de un BFF que no respondió o
// falló, sin dejar salir de `data/` un `HttpErrorResponse` (lote 08, PBI-0134). Dobles de `HttpClient` y
// `HttpErrorResponse` como en `notificaciones/data/bff-notificaciones.gateway.spec.mjs`.
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
  await leer('../domain/sesion.gateway.ts'),
  await leer('../../../core/bff-http.ts'),
  await leer('./bff-sesion.gateway.ts'),
].join('\n');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  dependencias,
  HttpClient,
  HttpErrorResponse,
  BffSesionGateway,
  SesionVencidaError,
  ServicioNoDisponibleError,
} = await import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);

const USUARIO = { id: 'u-1', name: 'Ana', email: 'ana@webstore.demo', role: 'superadmin', active: true };
function montar(respuesta) {
  const llamadas = [];
  dependencias.set(
    HttpClient,
    Object.assign(Object.create(HttpClient.prototype), {
      get: (url, opciones) => (llamadas.push({ url, opciones }), respuesta()),
    }),
  );
  return { gateway: new BffSesionGateway(), llamadas };
}
const rechazo = async (promesa) => {
  try {
    await promesa;
  } catch (error) {
    return error;
  }
  assert.fail('debía fallar');
};

test('current() pide la sesión con el token y devuelve el usuario', async () => {
  const { gateway, llamadas } = montar(() => Promise.resolve({ user: USUARIO }));
  assert.equal(await gateway.current('token-1'), USUARIO);
  assert.equal(llamadas[0].url, '/bff/admin/sessions/current');
  assert.equal(llamadas[0].opciones.headers.valores.authorization, 'Bearer token-1');
});

test('PBI-0257: current() traduce un 401 en SesionVencidaError', async () => {
  const { gateway } = montar(() => Promise.reject(new HttpErrorResponse({ status: 401 })));
  assert.ok((await rechazo(gateway.current('token-1'))) instanceof SesionVencidaError);
});

for (const status of [0, 500, 503, 403]) {
  test(`PBI-0257: current() traduce un ${status} en ServicioNoDisponibleError, no en sesión vencida`, async () => {
    const { gateway } = montar(() => Promise.reject(new HttpErrorResponse({ status })));
    const error = await rechazo(gateway.current('token-1'));
    assert.ok(error instanceof ServicioNoDisponibleError);
    assert.ok(!(error instanceof HttpErrorResponse));
    assert.equal(error.status, status);
  });
}
