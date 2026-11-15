import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 08 (ADR-0017), PBI-0025 y PBI-0134: el adaptador de los temas se prueba sin DOM; de `data/` no sale un
// `HttpErrorResponse` (regla 2 de `frontend/architecture.md`), tampoco al leer la apariencia pública.
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
const firstValueFrom = (peticion) => peticion;
`;
const fuente = [
  dobles,
  await leer('../../sesion/domain/sesion.gateway.ts'),
  await leer('../domain/temas.gateway.ts'),
  await leer('../../../core/bff-http.ts'),
  await leer('./bff-temas.gateway.ts'),
].join('\n');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  dependencias,
  HttpClient,
  HttpErrorResponse,
  BffTemasGateway,
  SesionVencidaError,
  ServicioNoDisponibleError,
  TemasDesactualizadosError,
  ReglaTemaError,
} = await import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);

const falla = (status, error) => Promise.reject(new HttpErrorResponse({ status, error }));
function montar(respuesta) {
  dependencias.set(
    HttpClient,
    Object.assign(Object.create(HttpClient.prototype), {
      get: () => respuesta(),
      put: () => respuesta(),
      post: () => respuesta(),
      delete: () => respuesta(),
    }),
  );
  return new BffTemasGateway();
}
const rechazo = async (promesa) => {
  try {
    await promesa;
  } catch (error) {
    return error;
  }
  assert.fail('debía fallar');
};

test('los fallos de las operaciones del Admin se traducen a errores del dominio', async () => {
  const desactualizado = montar(() => falla(409, { error: { code: 'STALE_THEMES' } }));
  assert.ok((await rechazo(desactualizado.activar('b', 1, 't'))) instanceof TemasDesactualizadosError);
  assert.ok((await rechazo(montar(() => falla(401)).temasAdmin('t'))) instanceof SesionVencidaError);
  const enUso = montar(() =>
    falla(422, { error: { code: 'ACTIVE_THEME_IN_USE', message: 'Activa otro tema antes de borrar este.' } }),
  );
  const regla = await rechazo(enUso.borrar('c', 1, 't'));
  assert.ok(regla instanceof ReglaTemaError);
  assert.equal(regla.code, 'ACTIVE_THEME_IN_USE');
});

test('un 5xx o un BFF caído no salen como HttpErrorResponse, ni en el Admin ni en la apariencia pública', async () => {
  for (const status of [0, 500]) {
    for (const llamar of [(g) => g.temasAdmin('t'), (g) => g.activar('b', 1, 't'), (g) => g.apariencia()]) {
      const error = await rechazo(llamar(montar(() => falla(status))));
      assert.ok(error instanceof ServicioNoDisponibleError, `estado ${status}`);
      assert.ok(!(error instanceof HttpErrorResponse));
    }
  }
});
