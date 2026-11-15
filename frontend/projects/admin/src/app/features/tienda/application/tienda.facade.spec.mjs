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
const fuente = [
  dobles,
  await leer('../../sesion/domain/sesion.gateway.ts'),
  await leer('../domain/cambio-registro.rules.ts'),
  await leer('../domain/tienda.gateway.ts'),
  await leer('./tienda.facade.ts'),
].join('\n');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  dependencias,
  SesionFacade,
  TiendaFacade,
  TiendaGateway,
  SnapshotDesactualizadoError,
  ReglaTiendaError,
  SesionVencidaError,
} = await import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);

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

// Lote 06 (ADR-0017): guardado por registro. El gateway falso guarda cada envío y responde, por número de llamada
// a `save`, el snapshot o el error indicado.
const producto = (id, cambios = {}) => ({
  id,
  sku: `SKU-${id}`,
  name: `Producto ${id}`,
  price: 100,
  stock: 9,
  gallery: ['foto.jpg'],
  ...cambios,
});
const snapshotCompleto = (revision, productos, cambios = {}) => ({
  revision,
  products: productos,
  categories: [],
  brands: [],
  customers: [],
  users: [],
  banners: [],
  rates: [],
  orders: [],
  complaints: [],
  config: { storeName: 'Tienda', footerText: 'Pie' },
  ...cambios,
});

function montarGuardado({ cargas, guardados }) {
  const envios = [];
  let cargasHechas = 0;
  const sesion = {
    requireToken: () => 'token',
    expiradas: 0,
    expirar() {
      this.expiradas += 1;
    },
  };
  const gateway = {
    load: async () => {
      const respuesta = cargas[cargasHechas++];
      if (respuesta instanceof Error) throw respuesta;
      return respuesta;
    },
    save: async (cambios) => {
      envios.push(structuredClone(cambios));
      const respuesta = guardados[envios.length - 1];
      if (respuesta instanceof Error) throw respuesta;
      return typeof respuesta === 'function' ? respuesta(cambios) : respuesta;
    },
  };
  dependencias.clear();
  dependencias.set(TiendaGateway, gateway);
  dependencias.set(SesionFacade, sesion);
  return { facade: new TiendaFacade(), envios, sesion };
}

const P1 = producto('p1');
const INICIO = snapshotCompleto(1, [P1, producto('p2')]);

test('PBI-0119 y PBI-0120: guardar un producto envía solo el registro y el campo cambiados', async () => {
  const respuesta = snapshotCompleto(2, [{ ...P1, price: 90 }, producto('p2')]);
  const { facade, envios } = montarGuardado({ cargas: [INICIO], guardados: [respuesta] });
  await facade.load();
  assert.equal(await facade.guardarProducto(P1, { ...P1, price: 90 }), true);
  assert.deepEqual(envios, [{ revision: 1, products: { upsert: [{ id: 'p1', price: 90 }] } }]);
  assert.equal(facade.snapshot(), respuesta);
  assert.deepEqual(facade.saving.historial, [true, false]);
});

test('PBI-0120: tras 409 recarga y reenvía el mismo cambio sobre la revisión nueva, sin pisar el stock vendido', async () => {
  const vendido = snapshotCompleto(5, [{ ...P1, stock: 7 }, producto('p2')]);
  const { facade, envios } = montarGuardado({
    cargas: [INICIO, vendido],
    guardados: [new SnapshotDesactualizadoError(), (cambios) => cambios],
  });
  await facade.load();
  assert.equal(await facade.guardarProducto(P1, { ...P1, price: 90 }), true);
  assert.deepEqual(envios[1], { revision: 5, products: { upsert: [{ id: 'p1', price: 90 }] } });
});

test('PBI-0120: tras 409, si el stock se vendió y la persona también lo cambió, no guarda y pide revisar', async () => {
  const vendido = snapshotCompleto(5, [{ ...P1, stock: 7 }, producto('p2')]);
  const { facade, envios } = montarGuardado({
    cargas: [INICIO, vendido],
    guardados: [new SnapshotDesactualizadoError()],
  });
  await facade.load();
  assert.equal(await facade.guardarProducto(P1, { ...P1, stock: 12 }), false);
  assert.equal(envios.length, 1, 'no reenvía');
  assert.match(facade.error(), /otra persona cambió el stock/);
  assert.equal(facade.snapshot(), vendido, 'la vista queda con los datos vigentes');
});

test('PBI-0142: tras 409, si otra persona eliminó el registro, no lo vuelve a crear', async () => {
  const sinP1 = snapshotCompleto(5, [producto('p2')]);
  const { facade, envios } = montarGuardado({
    cargas: [INICIO, sinP1],
    guardados: [new SnapshotDesactualizadoError()],
  });
  await facade.load();
  assert.equal(await facade.guardarProducto(P1, { ...P1, name: 'Nuevo nombre' }), false);
  assert.equal(envios.length, 1);
  assert.match(facade.error(), /ya no existe/);
});

test('PBI-0122: editar un registro que ya no está en los datos cargados no lo envía', async () => {
  const { facade, envios } = montarGuardado({
    cargas: [snapshotCompleto(1, [producto('p2')])],
    guardados: [],
  });
  await facade.load();
  assert.equal(await facade.guardarProducto(P1, { ...P1, price: 1 }), false);
  assert.equal(envios.length, 0);
  assert.match(facade.error(), /ya no existe/);
});

test('PBI-0121: mientras hay un guardado en curso, otro no se envía', async () => {
  let responder;
  const { facade, envios } = montarGuardado({
    cargas: [INICIO],
    guardados: [() => new Promise((resolve) => (responder = resolve))],
  });
  await facade.load();
  const primero = facade.guardarMarca(null, { id: 'b-1', name: 'Nueva', active: true });
  assert.equal(facade.saving(), true);
  assert.equal(await facade.guardarMarca(null, { id: 'b-2', name: 'Nueva', active: true }), false);
  responder(INICIO);
  assert.equal(await primero, true);
  assert.equal(envios.length, 1);
  assert.equal(facade.saving(), false);
});

test('PBI-0124: un 401 al guardar cierra la sesión del navegador', async () => {
  const { facade, sesion } = montarGuardado({ cargas: [INICIO], guardados: [new SesionVencidaError()] });
  await facade.load();
  assert.equal(await facade.eliminarProducto('p2'), false);
  assert.equal(sesion.expiradas, 1);
});

test('PBI-0125: un guardado rechazado no cambia el estado y deja el motivo', async () => {
  const { facade } = montarGuardado({
    cargas: [INICIO],
    guardados: [new ReglaTiendaError('Pesa demasiado.')],
  });
  await facade.load();
  const config = INICIO.config;
  assert.equal(await facade.guardarConfiguracion(config, { ...config, storeName: 'Otra' }), false);
  assert.equal(facade.snapshot(), INICIO, 'sin cambio optimista que deshacer');
  assert.equal(facade.config(), INICIO.config);
  assert.equal(facade.error(), 'Pesa demasiado.');
});

test('PBI-0125: la configuración envía solo las claves cambiadas', async () => {
  const { facade, envios } = montarGuardado({ cargas: [INICIO], guardados: [INICIO] });
  await facade.load();
  await facade.guardarConfiguracion(INICIO.config, { ...INICIO.config, footerText: 'Nuevo pie' });
  assert.deepEqual(envios, [{ revision: 1, config: { footerText: 'Nuevo pie' } }]);
});

test('PBI-0120: el estado de un pedido viaja solo como { id, status } y no pisa el de otra persona', async () => {
  const pedido = { id: 'WS-1', status: 'confirmed', total: 10 };
  const conPedido = snapshotCompleto(1, [], { orders: [pedido] });
  const otro = snapshotCompleto(2, [], { orders: [{ ...pedido, status: 'shipped' }] });
  const { facade, envios } = montarGuardado({
    cargas: [conPedido, otro],
    guardados: [new SnapshotDesactualizadoError()],
  });
  await facade.load();
  assert.equal(await facade.cambiarEstadoPedido(pedido, 'cancelled'), false);
  assert.deepEqual(envios, [{ revision: 1, orders: { upsert: [{ id: 'WS-1', status: 'cancelled' }] } }]);
  assert.match(facade.error(), /otra persona cambió el estado/);
});

// Lote 07 (ADR-0017). PBI-0140: sin «Actualizar» en la cabecera, cada página consulta los datos al entrar con
// `entrar()`: la primera vez, como `load()` (con el aviso de carga y de error del panel); después, como `refresh()`,
// sin aviso global.
test('PBI-0140: entrar() la primera vez carga con loading y, si falla, deja el aviso del panel', async () => {
  const { facade } = montar([new Error('caída'), INICIAL]);
  await facade.entrar();
  assert.equal(facade.error(), MENSAJE_CARGA);
  assert.deepEqual(facade.loading.historial, [true, false]);
  await facade.entrar();
  assert.equal(facade.snapshot(), INICIAL);
  assert.equal(facade.error(), null);
});

test('PBI-0140: con datos ya cargados, entrar() los vuelve a consultar sin aviso global', async () => {
  const { facade, llamadas } = montar([INICIAL, ACTUAL, new Error('caída')]);
  await facade.entrar();
  const loadingAntes = facade.loading.historial.length;
  await facade.entrar();
  assert.equal(llamadas(), 2);
  assert.equal(facade.snapshot(), ACTUAL);
  await facade.entrar();
  assert.equal(facade.snapshot(), ACTUAL, 'un fallo conserva lo que había');
  assert.equal(facade.error(), null);
  assert.equal(facade.loading.historial.length, loadingAntes, 'no vuelve a mostrar «Cargando operación…»');
});

// PBI-0150: la página que muestra el motivo de un guardado fallido junto a su botón lo toma de la facade, y la
// cabecera ya no lo repite (antes, los dos con role="alert").
test('PBI-0150: tomarError() devuelve el motivo y lo quita del aviso del panel', async () => {
  const { facade } = montarGuardado({
    cargas: [INICIO],
    guardados: [new ReglaTiendaError('Pesa demasiado.')],
  });
  await facade.load();
  const config = INICIO.config;
  assert.equal(await facade.guardarConfiguracion(config, { ...config, storeName: 'Otra' }), false);
  assert.equal(facade.tomarError(), 'Pesa demasiado.');
  assert.equal(facade.error(), null);
  assert.equal(facade.tomarError(), null);
});
