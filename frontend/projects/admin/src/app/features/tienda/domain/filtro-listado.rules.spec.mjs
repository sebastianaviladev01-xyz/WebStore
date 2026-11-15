import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 07 (ADR-0017), PBI-0139: filtros de Inventario, Clientes, Usuarios, Banners y Reclamaciones con la disposición
// de la feature 008, y su lectura y escritura en la URL. PBI-0059 (parte): el estado del stock de Inventario. La regla
// se transpila sin sus `import`, detrás de las reglas de las que depende.
const leer = async (ruta) =>
  (await readFile(new URL(ruta, import.meta.url), 'utf8')).replace(/^import [\s\S]*?;$/gm, '');
const fuente = [
  await leer('./categoria.rules.ts'),
  await leer('./listado.rules.ts'),
  await leer('./filtro-catalogo.model.ts'),
  await leer('./filtro-catalogo.rules.ts'),
  await leer('./inventario.rules.ts'),
  await leer('./tarifa-envio.rules.ts'),
  await leer('./filtro-listado.rules.ts'),
].join('\n');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const regla = await import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);
const {
  estadoDeStock,
  filtrarInventario,
  filtrarClientes,
  filtrarUsuarios,
  filtrarBanners,
  filtrarReclamos,
  leerFiltrosInventario,
  leerFiltrosClientes,
  leerFiltrosUsuarios,
  leerFiltrosBanners,
  leerFiltrosReclamos,
  parametrosDeFiltrosInventario,
  parametrosDeFiltrosClientes,
  parametrosDeFiltrosUsuarios,
  parametrosDeFiltrosBanners,
  parametrosDeFiltrosReclamos,
  filtrarPedidos,
  leerFiltrosPedidos,
  parametrosDeFiltrosPedidos,
  filtrarTarifasDeEnvio,
  leerFiltrosTarifas,
  parametrosDeFiltrosTarifas,
} = regla;

const ids = (lista) => lista.map((item) => item.id);

test('PBI-0059: el estado del stock es «sin stock» con 0, «stock bajo» hasta 5 y «disponible» desde 6', () => {
  assert.equal(estadoDeStock(0), 'sin-stock');
  assert.equal(estadoDeStock(1), 'stock-bajo');
  assert.equal(estadoDeStock(5), 'stock-bajo');
  assert.equal(estadoDeStock(6), 'disponible');
});

const productos = [
  { id: 'p1', name: 'Lavadora Ártica', sku: 'LAV-01', stock: 0 },
  { id: 'p2', name: 'Monitor Nova', sku: 'MON-02', stock: 3 },
  { id: 'p3', name: 'Cooler portátil', sku: 'COO-03', stock: 12 },
];

test('PBI-0139: Inventario filtra por nombre o SKU, sin tildes ni mayúsculas, y por estado del stock', () => {
  assert.deepEqual(ids(filtrarInventario(productos, { texto: '', estado: 'todos' })), ['p1', 'p2', 'p3']);
  assert.deepEqual(ids(filtrarInventario(productos, { texto: 'artica', estado: 'todos' })), ['p1']);
  assert.deepEqual(ids(filtrarInventario(productos, { texto: 'mon-0', estado: 'todos' })), ['p2']);
  assert.deepEqual(ids(filtrarInventario(productos, { texto: '', estado: 'sin-stock' })), ['p1']);
  assert.deepEqual(ids(filtrarInventario(productos, { texto: '', estado: 'stock-bajo' })), ['p2']);
  assert.deepEqual(ids(filtrarInventario(productos, { texto: '', estado: 'disponible' })), ['p3']);
  assert.deepEqual(ids(filtrarInventario(productos, { texto: 'o', estado: 'disponible' })), ['p3']);
});

test('PBI-0139: Clientes filtra por nombre, correo o documento', () => {
  const clientes = [
    { id: 'c1', name: 'José Pérez', email: 'jose@example.com', document: '12345678' },
    { id: 'c2', name: 'Ana Ríos', email: 'ana@correo.pe', document: '87654321' },
  ];
  assert.deepEqual(ids(filtrarClientes(clientes, { texto: '' })), ['c1', 'c2']);
  assert.deepEqual(ids(filtrarClientes(clientes, { texto: 'jose' })), ['c1']);
  assert.deepEqual(ids(filtrarClientes(clientes, { texto: 'CORREO.PE' })), ['c2']);
  assert.deepEqual(ids(filtrarClientes(clientes, { texto: '8765' })), ['c2']);
});

test('PBI-0139: Usuarios filtra por nombre o correo, por rol y por estado', () => {
  const usuarios = [
    { id: 'u1', name: 'Dueña', email: 'owner@x.pe', role: 'superadmin', active: true },
    { id: 'u2', name: 'Vendedor Uno', email: 'uno@x.pe', role: 'vendedor', active: true },
    { id: 'u3', name: 'Vendedor Dos', email: 'dos@x.pe', role: 'vendedor', active: false },
  ];
  const todos = { texto: '', rol: '', estado: 'todos' };
  assert.deepEqual(ids(filtrarUsuarios(usuarios, todos)), ['u1', 'u2', 'u3']);
  assert.deepEqual(ids(filtrarUsuarios(usuarios, { ...todos, texto: 'duena' })), ['u1']);
  assert.deepEqual(ids(filtrarUsuarios(usuarios, { ...todos, texto: 'dos@' })), ['u3']);
  assert.deepEqual(ids(filtrarUsuarios(usuarios, { ...todos, rol: 'vendedor' })), ['u2', 'u3']);
  assert.deepEqual(ids(filtrarUsuarios(usuarios, { ...todos, rol: 'vendedor', estado: 'inactivos' })), [
    'u3',
  ]);
});

test('PBI-0139: Banners filtra por título y por estado', () => {
  const banners = [
    { id: 'b1', title: 'Campaña de verano', active: true },
    { id: 'b2', title: 'Envío gratis', active: false },
  ];
  assert.deepEqual(ids(filtrarBanners(banners, { texto: '', estado: 'todos' })), ['b1', 'b2']);
  assert.deepEqual(ids(filtrarBanners(banners, { texto: 'envio', estado: 'todos' })), ['b2']);
  assert.deepEqual(ids(filtrarBanners(banners, { texto: '', estado: 'activos' })), ['b1']);
});

test('PBI-0139: Reclamaciones filtra por código, asunto, nombre o correo, y por estado', () => {
  const reclamos = [
    { id: 'REC-2026-00001', subject: 'Producto dañado', name: 'Ana', email: 'ana@x.pe', status: 'received' },
    { id: 'REC-2026-00002', subject: 'Demora', name: 'Luis', email: 'luis@x.pe', status: 'resolved' },
  ];
  assert.deepEqual(ids(filtrarReclamos(reclamos, { texto: '', estado: '' })), [
    'REC-2026-00001',
    'REC-2026-00002',
  ]);
  assert.deepEqual(ids(filtrarReclamos(reclamos, { texto: '00002', estado: '' })), ['REC-2026-00002']);
  assert.deepEqual(ids(filtrarReclamos(reclamos, { texto: 'danado', estado: '' })), ['REC-2026-00001']);
  assert.deepEqual(ids(filtrarReclamos(reclamos, { texto: 'luis@', estado: '' })), ['REC-2026-00002']);
  assert.deepEqual(ids(filtrarReclamos(reclamos, { texto: '', estado: 'received' })), ['REC-2026-00001']);
});

test('PBI-0139: cada listado lee sus filtros de la URL y un valor desconocido es el de por defecto', () => {
  assert.deepEqual(leerFiltrosInventario({}), { texto: '', estado: 'todos' });
  assert.deepEqual(leerFiltrosInventario({ texto: 'lav', estado: 'sin-stock' }), {
    texto: 'lav',
    estado: 'sin-stock',
  });
  assert.deepEqual(leerFiltrosInventario({ estado: 'otro' }), { texto: '', estado: 'todos' });
  assert.deepEqual(leerFiltrosClientes({ texto: 'ana' }), { texto: 'ana' });
  assert.deepEqual(leerFiltrosUsuarios({ rol: 'vendedor', estado: 'activos' }), {
    texto: '',
    rol: 'vendedor',
    estado: 'activos',
  });
  assert.deepEqual(leerFiltrosUsuarios({ rol: 'owner' }), { texto: '', rol: '', estado: 'todos' });
  assert.deepEqual(leerFiltrosBanners({ estado: 'inactivos' }), { texto: '', estado: 'inactivos' });
  assert.deepEqual(leerFiltrosReclamos({ estado: 'in-review' }), { texto: '', estado: 'in-review' });
  assert.deepEqual(leerFiltrosReclamos({ estado: 'cerrado' }), { texto: '', estado: '' });
});

test('PBI-0139: al escribir la URL se omiten los valores por defecto y los espacios de los extremos', () => {
  assert.deepEqual(parametrosDeFiltrosInventario({ texto: ' lav ', estado: 'todos' }), { texto: 'lav' });
  assert.deepEqual(parametrosDeFiltrosInventario({ texto: '', estado: 'stock-bajo' }), {
    estado: 'stock-bajo',
  });
  assert.deepEqual(parametrosDeFiltrosClientes({ texto: '' }), {});
  assert.deepEqual(parametrosDeFiltrosUsuarios({ texto: 'ana', rol: '', estado: 'inactivos' }), {
    texto: 'ana',
    estado: 'inactivos',
  });
  assert.deepEqual(parametrosDeFiltrosBanners({ texto: '', estado: 'activos' }), { estado: 'activos' });
  assert.deepEqual(parametrosDeFiltrosReclamos({ texto: 'REC', estado: 'resolved' }), {
    texto: 'REC',
    estado: 'resolved',
  });
  for (const [leerFiltros, escribir, filtros] of [
    [leerFiltrosInventario, parametrosDeFiltrosInventario, { texto: 'mon', estado: 'disponible' }],
    [leerFiltrosUsuarios, parametrosDeFiltrosUsuarios, { texto: 'x', rol: 'admin', estado: 'activos' }],
    [leerFiltrosReclamos, parametrosDeFiltrosReclamos, { texto: 'y', estado: 'received' }],
  ])
    assert.deepEqual(leerFiltros(escribir(filtros)), filtros, 'ida y vuelta');
});

// Lote 07b (ADR-0017), PBI-0155: Pedidos (estado) y Tarifas de envío (distrito u origen, y origen) con el mismo panel.
const pedidos = [
  { id: 'WS-1', status: 'confirmed' },
  { id: 'WS-2', status: 'delivered' },
  { id: 'WS-3', status: 'confirmed' },
];

test('PBI-0155: Pedidos filtra por estado; sin estado, todos', () => {
  assert.deepEqual(ids(filtrarPedidos(pedidos, { estado: '' })), ['WS-1', 'WS-2', 'WS-3']);
  assert.deepEqual(ids(filtrarPedidos(pedidos, { estado: 'confirmed' })), ['WS-1', 'WS-3']);
  assert.deepEqual(ids(filtrarPedidos(pedidos, { estado: 'cancelled' })), []);
});

const tarifas = [
  { id: 't1', origin: 'San Isidro', destination: 'Jesús María', price: 10 },
  { id: 't2', origin: 'Callao', destination: 'Comas 10', price: 12 },
  { id: 't3', origin: 'Callao', destination: 'Comas 2', price: 11 },
];

test('PBI-0155: Tarifas de envío filtra por distrito u origen y por origen, en orden de origen y distrito', () => {
  assert.deepEqual(ids(filtrarTarifasDeEnvio(tarifas, { texto: '', origen: '' })), ['t3', 't2', 't1']);
  assert.deepEqual(ids(filtrarTarifasDeEnvio(tarifas, { texto: 'jesus', origen: '' })), ['t1']);
  assert.deepEqual(ids(filtrarTarifasDeEnvio(tarifas, { texto: 'comas', origen: 'Callao' })), ['t3', 't2']);
  assert.deepEqual(ids(filtrarTarifasDeEnvio(tarifas, { texto: '', origen: 'San Isidro' })), ['t1']);
});

test('PBI-0155: Pedidos y Tarifas leen sus filtros de la URL; un estado desconocido es «todos»', () => {
  assert.deepEqual(leerFiltrosPedidos({}), { estado: '' });
  assert.deepEqual(leerFiltrosPedidos({ estado: 'shipped' }), { estado: 'shipped' });
  assert.deepEqual(leerFiltrosPedidos({ estado: 'perdido' }), { estado: '' });
  assert.deepEqual(leerFiltrosTarifas({}), { texto: '', origen: '' });
  assert.deepEqual(leerFiltrosTarifas({ texto: 'comas', origen: 'Callao' }), {
    texto: 'comas',
    origen: 'Callao',
  });
});

test('PBI-0155: al escribir la URL de Pedidos y Tarifas se omiten los valores por defecto', () => {
  assert.deepEqual(parametrosDeFiltrosPedidos({ estado: '' }), {});
  assert.deepEqual(parametrosDeFiltrosPedidos({ estado: 'delivered' }), { estado: 'delivered' });
  assert.deepEqual(parametrosDeFiltrosTarifas({ texto: '  comas ', origen: '' }), { texto: 'comas' });
  assert.deepEqual(parametrosDeFiltrosTarifas({ texto: '', origen: 'Callao' }), { origen: 'Callao' });
});
