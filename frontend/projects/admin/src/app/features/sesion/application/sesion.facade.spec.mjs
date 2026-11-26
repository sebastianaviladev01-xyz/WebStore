import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 40 (ADR-0032), PBI-0257: al restaurar la sesión del backoffice, solo un `401` (la sesión ya no vale) borra el
// token. Un fallo de red o del servidor lo conserva y deja la sesión «sin comprobar», sin usuario, hasta que un
// reintento responda. La facade se transpila sin sus `import`, con sus reglas de `domain/` y dobles de Angular
// (`signal`, `computed`, `inject`, `Injectable`) y de `sessionStorage` (método de `temas.facade.spec.mjs`).
const leer = async (ruta) =>
  (await readFile(new URL(ruta, import.meta.url), 'utf8')).replace(/^import [\s\S]*?;$/gm, '');
const dobles = `
const signal = (inicial) => {
  let valor = inicial;
  const leer = () => valor;
  leer.set = (nuevo) => { valor = nuevo; };
  leer.asReadonly = () => () => valor;
  return leer;
};
const computed = (calcular) => () => calcular();
const Injectable = () => (clase) => clase;
export const almacen = new Map();
const sessionStorage = {
  getItem: (clave) => (almacen.has(clave) ? almacen.get(clave) : null),
  setItem: (clave, valor) => almacen.set(clave, String(valor)),
  removeItem: (clave) => almacen.delete(clave),
};
export const dependencias = new Map();
const inject = (token) => dependencias.get(token);
`;
const fuente = [
  dobles,
  await leer('../domain/rol.rules.ts'),
  await leer('../domain/borrador.rules.ts'),
  await leer('../domain/sesion.gateway.ts'),
  await leer('./sesion.facade.ts'),
].join('\n');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  almacen,
  dependencias,
  SesionFacade,
  SesionGateway,
  SesionVencidaError,
  ServicioNoDisponibleError,
  AVISO_SESION_VENCIDA,
} = await import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);

const CLAVE = 'webstore-admin-session-v1';
const USUARIO = { id: 'u-1', name: 'Ana', email: 'ana@webstore.demo', role: 'superadmin', active: true };

/**
 * Facade con el token `token-1` guardado y un gateway falso: `current` recibe el número de llamada (1, 2…) y devuelve
 * el usuario o lanza. Espera a que termine la restauración.
 */
async function montar(current) {
  let llamadas = 0;
  almacen.clear();
  almacen.set(CLAVE, 'token-1');
  dependencias.clear();
  dependencias.set(SesionGateway, {
    current: async (token) => {
      llamadas++;
      assert.equal(token, 'token-1');
      return current(llamadas);
    },
  });
  const facade = new SesionFacade();
  await facade.ensureReady();
  return { facade, llamadas: () => llamadas };
}
const red = () => {
  throw new ServicioNoDisponibleError(0);
};
const servidor = () => {
  throw new ServicioNoDisponibleError(503);
};
const vencida = () => {
  throw new SesionVencidaError();
};

test('PBI-0257: con el BFF respondiendo, la sesión se restaura con el usuario', async () => {
  const { facade } = await montar(() => USUARIO);
  assert.deepEqual(facade.user(), USUARIO);
  assert.equal(facade.isAuthenticated(), true);
  assert.equal(facade.sesionSinComprobar(), false);
});

test('PBI-0257: un 401 al restaurar borra el token, como antes, sin aviso de «sin comprobar»', async () => {
  const { facade } = await montar(vencida);
  assert.equal(facade.isAuthenticated(), false);
  assert.equal(facade.token(), null);
  assert.equal(almacen.get(CLAVE), undefined);
  assert.equal(facade.sesionSinComprobar(), false);
});

for (const [motivo, falla] of [
  ['un fallo de red', red],
  ['un 503', servidor],
]) {
  test(`PBI-0257: ${motivo} al restaurar conserva el token y deja la sesión sin comprobar, sin usuario`, async () => {
    const { facade } = await montar(falla);
    assert.equal(facade.token(), 'token-1');
    assert.equal(almacen.get(CLAVE), 'token-1');
    assert.equal(facade.user(), null);
    assert.equal(facade.isAuthenticated(), false, 'sin usuario no se entra al panel');
    assert.equal(facade.sesionSinComprobar(), true);
  });
}

test('PBI-0257: al reintentar con el BFF de vuelta, queda el usuario y se quita el aviso', async () => {
  const { facade, llamadas } = await montar((n) => (n === 1 ? servidor() : USUARIO));
  assert.equal(await facade.reintentarComprobacion(), true);
  assert.equal(llamadas(), 2);
  assert.deepEqual(facade.user(), USUARIO);
  assert.equal(facade.isAuthenticated(), true);
  assert.equal(facade.sesionSinComprobar(), false);
  assert.equal(facade.token(), 'token-1');
});

test('PBI-0257: si el reintento vuelve a fallar, el token sigue y la sesión sigue sin comprobar', async () => {
  const { facade, llamadas } = await montar(red);
  assert.equal(await facade.reintentarComprobacion(), false);
  assert.equal(llamadas(), 2);
  assert.equal(facade.token(), 'token-1');
  assert.equal(facade.isAuthenticated(), false);
  assert.equal(facade.sesionSinComprobar(), true);
  assert.equal(facade.comprobando(), false);
});

test('PBI-0257: si el reintento responde 401, se borra el token y el acceso dice que la sesión venció', async () => {
  const { facade } = await montar((n) => (n === 1 ? servidor() : vencida()));
  assert.equal(await facade.reintentarComprobacion(), false);
  assert.equal(facade.token(), null);
  assert.equal(almacen.get(CLAVE), undefined);
  assert.equal(facade.sesionSinComprobar(), false);
  assert.equal(facade.error(), AVISO_SESION_VENCIDA);
});

test('PBI-0257: tras reintentar con éxito, el acceso lleva a la página que se quiso abrir', async () => {
  const { facade } = await montar((n) => (n === 1 ? servidor() : USUARIO));
  facade.anotarRutaSinComprobar('/productos/p-002?pagina=2');
  await facade.reintentarComprobacion();
  assert.equal(facade.tomarRetorno(), '/productos/p-002?pagina=2');
  assert.equal(facade.tomarRetorno(), '/', 'una sola vez');
});

test('PBI-0257: sin sesión sin comprobar, no se anota la página (el acceso normal lleva al Dashboard)', async () => {
  const { facade } = await montar(vencida);
  facade.anotarRutaSinComprobar('/productos');
  assert.equal(facade.tomarRetorno(), '/');
});

test('PBI-0257: cerrar la sesión mientras está sin comprobar borra el token y quita el aviso', async () => {
  const { facade } = await montar(servidor);
  dependencias.get(SesionGateway).logout = async () => {};
  await facade.logout();
  assert.equal(facade.token(), null);
  assert.equal(almacen.get(CLAVE), undefined);
  assert.equal(facade.sesionSinComprobar(), false);
});
