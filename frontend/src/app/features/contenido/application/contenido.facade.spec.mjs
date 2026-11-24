import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 15 (ADR-0021), PBI-0182: si el contenido nunca llegó del BFF, la tienda muestra un aviso de mantenimiento con
// «Reintentar» en lugar de una tienda a medias. Si ya había llegado, un fallo al recargarlo lo conserva (PBI-0111). Es
// el método de las facades del Admin: se transpila sin sus `import` y Angular se sustituye por dobles (sin DOM).
const leer = async (ruta) =>
  (await readFile(new URL(ruta, import.meta.url), 'utf8')).replace(/^import [\s\S]*?;$/gm, '');
const dobles = `
const signal = (inicial) => {
  let valor = inicial;
  const leer = () => valor;
  leer.set = (nuevo) => { valor = nuevo; };
  leer.update = (cambiar) => { valor = cambiar(valor); };
  leer.asReadonly = () => leer;
  return leer;
};
const computed = (calcular) => () => calcular();
const Injectable = () => (clase) => clase;
export const dependencias = new Map();
const inject = (token) => dependencias.get(token);
`;
const fuente = [
  dobles,
  await leer('../domain/banner.rules.ts'),
  await leer('../domain/contenido.gateway.ts'),
  await leer('./contenido.facade.ts'),
].join('\n');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { dependencias, ContenidoFacade, ContenidoGateway } = await import(
  `data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`
);

const AJUSTES = {
  storeName: 'Mi tienda',
  contactEmails: [{ value: 'hola@mitienda.pe', label: '' }],
  contactPageEnabled: true,
};

/** Facade con un gateway que responde lo que diga `respuestas` (`'falla'` lanza un error), en orden. */
function montar(...respuestas) {
  const pendientes = [...respuestas];
  let ultima = pendientes[0];
  const gateway = Object.assign(Object.create(ContenidoGateway.prototype), {
    getSettings: async () => {
      ultima = pendientes.length ? pendientes.shift() : ultima;
      if (ultima === 'falla') throw new Error('503');
      return ultima;
    },
    getBanners: async () => [],
  });
  dependencias.set(ContenidoGateway, gateway);
  return new ContenidoFacade();
}

test('PBI-0182: mientras carga no está en mantenimiento; al llegar el contenido queda listo', async () => {
  const facade = montar(AJUSTES);
  assert.equal(facade.estado(), 'cargando');
  assert.equal(facade.enMantenimiento(), false);
  await facade.load();
  assert.equal(facade.estado(), 'listo');
  assert.equal(facade.enMantenimiento(), false);
  assert.equal(facade.settings().storeName, 'Mi tienda');
});

test('PBI-0182: si el contenido nunca llegó, la tienda queda en mantenimiento', async () => {
  const facade = montar('falla');
  await facade.load();
  assert.equal(facade.estado(), 'sin-contenido');
  assert.equal(facade.enMantenimiento(), true);
});

test('PBI-0182: «Reintentar» vuelve a pedir el contenido; mientras tanto sigue el aviso, y al llegar se quita', async () => {
  const facade = montar('falla', 'falla', AJUSTES);
  await facade.load();
  const reintento = facade.reintentar();
  assert.equal(facade.reintentando(), true);
  assert.equal(facade.enMantenimiento(), true, 'el aviso no parpadea mientras se reintenta');
  await reintento;
  assert.equal(facade.reintentando(), false);
  assert.equal(facade.enMantenimiento(), true, 'el segundo intento también falló');
  await facade.reintentar();
  assert.equal(facade.enMantenimiento(), false);
  assert.equal(facade.settings().storeName, 'Mi tienda');
});

test('PBI-0111 y PBI-0182: si ya había llegado, un fallo al recargar conserva el contenido y no muestra el aviso', async () => {
  const facade = montar(AJUSTES, 'falla');
  await facade.load();
  await facade.load(true);
  assert.equal(facade.estado(), 'listo');
  assert.equal(facade.enMantenimiento(), false);
  assert.equal(facade.settings().storeName, 'Mi tienda');
  assert.deepEqual(facade.settings().contactEmails, [{ value: 'hola@mitienda.pe', label: '' }]);
});

test('PBI-0182: antes de que llegue, el respaldo no trae correos, teléfonos, redes ni avisos de la demo', () => {
  const facade = montar(AJUSTES);
  const respaldo = facade.settings();
  assert.deepEqual(respaldo.contactEmails, []);
  assert.deepEqual(respaldo.contactPhones, []);
  assert.deepEqual(respaldo.socialLinks, []);
  assert.deepEqual(respaldo.announcements, []);
});
