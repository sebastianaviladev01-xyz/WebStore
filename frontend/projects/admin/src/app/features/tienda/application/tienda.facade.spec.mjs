import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// TEST-08 (feature 008): `load()` (caracterización) y `refresh()` de `TiendaFacade`. Patrón de
// `temas.facade.spec.mjs`: la facade se transpila sin sus `import`, junto con los errores del puerto, y Angular, la
// sesión, `ROLES` y las reglas de tarifas se sustituyen por dobles. El doble de `signal` guarda cada valor fijado,
// para comprobar que `refresh()` nunca toca `loading` ni `error`.
const leer = async (ruta) =>
  (await readFile(new URL(ruta, import.meta.url), 'utf8')).replace(/^import [\s\S]*?;$/gm, '');
const dobles = `
const signal = (inicial) => {
  let valor = inicial;
  const leer = () => valor;
  leer.historial = [];
  leer.set = (nuevo) => { valor = nuevo; leer.historial.push(nuevo); };
  leer.asReadonly = () => () => valor;
  return leer;
};
const computed = (calcular) => () => calcular();
const Injectable = () => (clase) => clase;
export class SesionFacade {}
const ROLES = [];
const ajustarPreciosTarifas = () => { throw new Error('no se usa en esta prueba'); };
const asignarPrecioTarifa = () => { throw new Error('no se usa en esta prueba'); };
export const dependencias = new Map();
const inject = (token) => dependencias.get(token);
`;
const fuente = [dobles, await leer('../domain/tienda.gateway.ts'), await leer('./tienda.facade.ts')].join(
  '\n',
);
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { dependencias, SesionFacade, TiendaFacade, TiendaGateway } = await import(
  `data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`
);

const snapshot = (revision, nombres) => ({
  revision,
  products: nombres.map((name, indice) => ({ id: `p${indice + 1}`, name })),
  categories: [],
  brands: [],
});
const INICIAL = snapshot(1, ['Lavadora', 'Monitor']);
const ACTUAL = snapshot(2, ['Lavadora', 'Monitor', 'Cooler portátil']);
const MENSAJE_CARGA =
  'No pudimos cargar la información del panel. Actualiza la página o vuelve a iniciar sesión.';

/** Facade con un gateway falso: `respuestas` da, por número de llamada a `load` (1, 2…), el snapshot o un error. */
function montar(respuestas) {
  let llamadas = 0;
  const gateway = {
    load: async (token) => {
      llamadas += 1;
      assert.equal(token, 'token', 'la consulta lleva el token de la sesión');
      const respuesta = respuestas[llamadas - 1];
      if (respuesta instanceof Error) throw respuesta;
      return respuesta;
    },
    save: async () => {
      throw new Error('no se usa en esta prueba');
    },
  };
  dependencias.clear();
  dependencias.set(TiendaGateway, gateway);
  dependencias.set(SesionFacade, { requireToken: () => 'token' });
  return { facade: new TiendaFacade(), llamadas: () => llamadas };
}
const nombres = (facade) => facade.products().map((producto) => producto.name);

test('TEST-08 (caracterización): load() carga el snapshot, con loading mientras consulta', async () => {
  const { facade } = montar([INICIAL]);
  await facade.load();
  assert.equal(facade.snapshot(), INICIAL);
  assert.equal(facade.error(), null);
  assert.equal(facade.loading(), false);
  assert.deepEqual(facade.loading.historial, [true, false]);
});

test('TEST-08 (caracterización): load() con error conserva el estado, fija error y loading vuelve a false', async () => {
  const { facade } = montar([INICIAL, new Error('caída')]);
  await facade.load();
  await facade.load();
  assert.equal(facade.snapshot(), INICIAL, 'conserva el estado anterior');
  assert.equal(facade.error(), MENSAJE_CARGA);
  assert.equal(facade.loading(), false);
});

test('TEST-08: refresh() con respuesta reemplaza el estado y devuelve true, sin tocar loading ni error', async () => {
  const { facade, llamadas } = montar([INICIAL, ACTUAL]);
  await facade.load();
  const loadingAntes = facade.loading.historial.length;
  const errorAntes = facade.error.historial.length;
  assert.equal(await facade.refresh(), true);
  assert.equal(llamadas(), 2, 'vuelve a pedir el snapshot');
  assert.equal(facade.snapshot(), ACTUAL);
  assert.deepEqual(nombres(facade), ['Lavadora', 'Monitor', 'Cooler portátil']);
  assert.equal(facade.loading.historial.length, loadingAntes, 'no activa loading');
  assert.equal(facade.error.historial.length, errorAntes, 'no toca error');
});

test('TEST-08: refresh() con fallo conserva el estado, no toca error ni loading y devuelve false', async () => {
  const { facade } = montar([INICIAL, new Error('caída'), new Error('caída')]);
  await facade.load();
  await facade.load();
  const loadingAntes = facade.loading.historial.length;
  const errorAntes = facade.error.historial.length;
  assert.equal(await facade.refresh(), false);
  assert.equal(facade.snapshot(), INICIAL, 'conserva el estado');
  assert.equal(facade.error(), MENSAJE_CARGA, 'el error de load() sigue igual');
  assert.equal(facade.loading(), false);
  assert.equal(facade.loading.historial.length, loadingAntes, 'no toca loading');
  assert.equal(facade.error.historial.length, errorAntes, 'no toca error');
});

test('TEST-08: refresh() sin sesión devuelve false y conserva el estado', async () => {
  const { facade } = montar([INICIAL]);
  await facade.load();
  dependencias.get(SesionFacade).requireToken = () => {
    throw new Error('sin sesión');
  };
  // La facade guardó la referencia a la sesión al construirse: el cambio del doble le llega.
  assert.equal(await facade.refresh(), false);
  assert.equal(facade.snapshot(), INICIAL);
  assert.equal(facade.error(), null);
});
