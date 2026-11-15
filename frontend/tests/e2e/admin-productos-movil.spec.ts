import { expect, test, type Locator, type Page } from '@playwright/test';

import { TEMAS, activarTema, colorDelToken, restablecerTemas, type Tema } from './apoyo/contraste';
import { cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';

/**
 * Productos del Admin en pantallas estrechas (feature 007). No guarda ni borra productos: los datos del BFF no
 * cambian, y al terminar B queda activo.
 *
 * - TEST-01 (AC-01, AC-04): con A, B y C, a 360, 375 y 390 px, la página no desplaza en horizontal ni al entrar
 *   ni editando, y ningún elemento de `main` acaba a la derecha de `clientWidth`.
 * - TEST-02 (AC-02, AC-04): el formulario «Nuevo producto» tiene todos sus campos, la galería, «Agregar»,
 *   «Cargar foto» y «Guardar producto» dentro de su caja; la ayuda de «Miniatura optimizada» acaba por encima de
 *   la galería; al editar «OLED Vision 55” 4K» y añadir una foto, las miniaturas, sus botones y el aviso de foto
 *   repetida quedan dentro de la galería.
 * - TEST-03 (AC-03, AC-04): para los seis productos del seed, el nombre, el SKU (una sola línea), el precio, el
 *   stock y las acciones se ven, caben en la lista y no se solapan; la cabecera se oculta o cabe; la celda del
 *   stock dice «Stock N» y el 0 tiene el color de `--ws-danger`.
 * - TEST-04 (AC-01, AC-03): lo mismo con el vendedor y B a 375 px, sin «Eliminar» (desde el lote 07, con «Nuevo
 *   producto»: PBI-0013).
 * - TEST-05 (AC-05): con B, a 768 y 1440 px, el escritorio sigue igual (cabecera, una sola línea por fila, la
 *   celda solo con el número, la ayuda de la miniatura en una línea); a 767 px, la cabecera se oculta y la celda
 *   dice «Stock N».
 *
 * Desde la feature 008, el formulario está en su interfaz de registro: «Nuevo producto» en `/productos/nuevo` y
 * «Editar» (un enlace) en `/productos/:id`. La lista sigue en `/productos`.
 *
 * Los localizadores usan roles y textos visibles (`frontend/architecture.md` §6). La fila de un producto es un
 * `div` sin otro rol: se localiza como el `div` de la lista que tiene el enlace «Editar» y el nombre, y sus hijos
 * directos son, en orden, el bloque del producto (nombre en `strong` y línea del SKU en `p`), el precio, el
 * stock y las acciones. Se leen con `evaluate` para medir sus cajas. Las aserciones son `expect.soft`, con el
 * tema, el ancho y lo que se comprueba, para que el informe muestre todas las causas de un rojo.
 */
const TOLERANCIA = 0.5;

/**
 * Productos del seed. El stock no se fija: las specs de la tienda compran y lo bajan antes que esta en la suite
 * completa (por ejemplo, «Soundbar Cinema 500» pasa de 12 a 8). La celda se compara con su forma («Stock N» o
 * «N»); solo se fija el 0 de «Microondas EasyCook 30 L», que no se puede comprar.
 */
const PRODUCTOS = [
  { nombre: 'OLED Vision 55” 4K', sku: 'TV-OLED-55-VSN', sinStock: false },
  { nombre: 'Lavadora SmartWash 18 kg', sku: 'WM-SW-18', sinStock: false },
  { nombre: 'Refrigeradora FreshMax 420 L', sku: 'RF-FM-420', sinStock: false },
  { nombre: 'Soundbar Cinema 500', sku: 'SB-CIN-500', sinStock: false },
  { nombre: 'Monitor UltraWide 34”', sku: 'MN-UW-34', sinStock: false },
  { nombre: 'Microondas EasyCook 30 L', sku: 'MW-EC-30', sinStock: true },
] as const;

/** Texto visible de la celda del stock: con la etiqueta por debajo de 768 px, solo el número desde 768 px. */
const STOCK_CON_ETIQUETA = /^Stock \d+$/;
const STOCK_SOLO_NUMERO = /^\d+$/;

const PRODUCTO_CON_GALERIA = PRODUCTOS[0].nombre;
const FOTO_NUEVA = 'assets/products/washer-studio.jpg';
const AYUDA_MINIATURA = 'Opcional. Si la dejas vacía se usa la imagen principal.';
const AVISO_FOTO_REPETIDA = 'Esa foto ya está en el producto.';

interface Caja {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

const caja = (elemento: Locator): Promise<Caja> =>
  elemento.evaluate((nodo) => {
    const { left, top, right, bottom, width, height } = nodo.getBoundingClientRect();
    return { left, top, right, bottom, width, height };
  });

const dentro = (interior: Caja, exterior: Caja): boolean =>
  interior.left >= exterior.left - TOLERANCIA &&
  interior.right <= exterior.right + TOLERANCIA &&
  interior.top >= exterior.top - TOLERANCIA &&
  interior.bottom <= exterior.bottom + TOLERANCIA;

const solapan = (a: Caja, b: Caja): boolean =>
  Math.min(a.right, b.right) - Math.max(a.left, b.left) > TOLERANCIA &&
  Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > TOLERANCIA;

const texto = (c: Caja): string =>
  `x ${c.left.toFixed(1)}–${c.right.toFixed(1)}, y ${c.top.toFixed(1)}–${c.bottom.toFixed(1)}`;

const centroY = (c: Caja): number => (c.top + c.bottom) / 2;

/** Lugar de la medida en los mensajes: «B · 375 px». */
interface Lugar {
  tema: string;
  ancho: number;
}
const etiqueta = ({ tema, ancho }: Lugar, que: string): string => `${tema} · ${ancho} px · ${que}`;

const lista = (page: Page) => page.getByRole('region', { name: 'Lista de productos' });

// Lote 07 (PBI-0132): la lista es una tabla. La fila de encabezados se oculta en el celular, así que se busca por
// su rol en el DOM (también oculta).
const cabecera = (page: Page) =>
  lista(page)
    .locator('[role="row"]')
    .filter({ has: page.getByText('Producto', { exact: true }) })
    .filter({ has: page.getByText('Precio', { exact: true }) });

const filaDe = (page: Page, nombre: string) =>
  lista(page)
    .getByRole('row')
    .filter({ has: page.getByRole('link', { name: /^Editar / }) })
    .filter({ hasText: nombre });

/** Hijos directos de la fila (bloque, precio, stock, acciones): cajas, y texto visible de cada uno. */
interface HijoDeFila {
  caja: Caja;
  texto: string;
}

async function hijosDeFila(fila: Locator): Promise<HijoDeFila[]> {
  return fila.evaluate((nodo) =>
    Array.from(nodo.children).map((hijo) => {
      const { left, top, right, bottom, width, height } = hijo.getBoundingClientRect();
      return {
        caja: { left, top, right, bottom, width, height },
        texto: (hijo as HTMLElement).innerText.replace(/\s+/g, ' ').trim(),
      };
    }),
  );
}

/** Rectángulos de la línea del SKU: cuántas líneas ocupa (valores de `top` distintos con ancho mayor que 0). */
async function lineasDelSku(fila: Locator, sku: string): Promise<number> {
  return fila.evaluate((nodo, buscado) => {
    const bloque = nodo.children[0];
    const parrafo = bloque.querySelector('p');
    if (!parrafo) throw new Error('La fila no tiene la línea del SKU');
    const recorrido = document.createTreeWalker(parrafo, NodeFilter.SHOW_TEXT);
    for (let actual = recorrido.nextNode(); actual; actual = recorrido.nextNode()) {
      const posicion = (actual.textContent ?? '').indexOf(buscado);
      if (posicion < 0) continue;
      const rango = document.createRange();
      rango.setStart(actual, posicion);
      rango.setEnd(actual, posicion + buscado.length);
      const rectangulos = Array.from(rango.getClientRects()).filter((r) => r.width > 0);
      return new Set(rectangulos.map((r) => Math.round(r.top))).size;
    }
    throw new Error(`La línea del SKU no contiene «${buscado}»`);
  }, sku);
}

/** Cuántas líneas ocupa un texto: valores de `top` distintos (redondeados) de un `Range` sobre sus caracteres. */
async function lineasDeTexto(elemento: Locator): Promise<number> {
  return elemento.evaluate((nodo) => {
    const rango = document.createRange();
    rango.selectNodeContents(nodo);
    const rectangulos = Array.from(rango.getClientRects()).filter((r) => r.width > 0);
    return new Set(rectangulos.map((r) => Math.round(r.top))).size;
  });
}

/** Carga `/productos` al ancho indicado y espera el título y las seis filas. */
async function abrirProductos(page: Page, ancho: number, alto: number): Promise<void> {
  await page.setViewportSize({ width: ancho, height: alto });
  await page.goto('/productos');
  await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
  await expect(lista(page)).toBeVisible();
  await expect(lista(page).getByRole('link', { name: /^Editar / })).toHaveCount(PRODUCTOS.length);
  await page.evaluate(() => document.fonts.ready);
}

/** Carga `/productos/nuevo` (feature 008) y espera el formulario «Nuevo producto». */
async function abrirNuevoProducto(page: Page): Promise<void> {
  await page.goto('/productos/nuevo');
  await expect(page.getByRole('form', { name: 'Nuevo producto' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** TEST-01: sin desplazamiento horizontal y ningún elemento de `main` pasa del borde derecho. */
async function comprobarSinDesborde(page: Page, lugar: Lugar, momento: string): Promise<void> {
  const medida = await page.evaluate(() => {
    const raiz = document.documentElement;
    const fuera: string[] = [];
    for (const nodo of Array.from(document.querySelectorAll('main *'))) {
      const { right, width, height } = nodo.getBoundingClientRect();
      if (width <= 0 || height <= 0 || right <= raiz.clientWidth + 0.5) continue;
      const contenido = ((nodo as HTMLElement).innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 30);
      fuera.push(`<${nodo.tagName.toLowerCase()}> «${contenido}» right ${right.toFixed(1)}`);
    }
    return { scrollWidth: raiz.scrollWidth, clientWidth: raiz.clientWidth, fuera };
  });
  expect
    .soft(medida.scrollWidth, etiqueta(lugar, `${momento} · scrollWidth (clientWidth ${medida.clientWidth})`))
    .toBe(medida.clientWidth);
  expect
    .soft(
      medida.fuera,
      etiqueta(lugar, `${momento} · elementos de main a la derecha de ${medida.clientWidth}`),
    )
    .toEqual([]);
}

/** TEST-03 y TEST-04: la lista de productos, con o sin «Eliminar». */
async function comprobarLista(page: Page, lugar: Lugar, conEliminar: boolean): Promise<void> {
  const region = lista(page);
  const cajaDeLista = await caja(region);
  const desplazamiento = await region.evaluate((nodo) => ({
    scrollWidth: nodo.scrollWidth,
    clientWidth: nodo.clientWidth,
  }));
  expect
    .soft(
      desplazamiento.scrollWidth,
      etiqueta(lugar, `lista · scrollWidth (clientWidth ${desplazamiento.clientWidth})`),
    )
    .toBe(desplazamiento.clientWidth);

  const encabezado = cabecera(page);
  await expect(encabezado).toHaveCount(1);
  if (await encabezado.isVisible()) {
    const medida = await encabezado.evaluate((nodo) => ({
      scrollWidth: nodo.scrollWidth,
      clientWidth: nodo.clientWidth,
    }));
    expect
      .soft(
        medida.scrollWidth <= medida.clientWidth,
        etiqueta(
          lugar,
          `cabecera visible y cabe (scrollWidth ${medida.scrollWidth}, clientWidth ${medida.clientWidth})`,
        ),
      )
      .toBe(true);
  }

  const colorPeligro = await colorDelToken(page, '--ws-danger');
  for (const producto of PRODUCTOS) {
    const fila = filaDe(page, producto.nombre);
    await expect(fila).toHaveCount(1);
    const que = (parte: string) => etiqueta(lugar, `${producto.nombre} · ${parte}`);

    const visibles: [string, Locator][] = [
      ['nombre', fila.getByText(producto.nombre, { exact: true })],
      ['línea del SKU', fila.getByText(producto.sku)],
      ['Editar', fila.getByRole('link', { name: /^Editar / })],
    ];
    if (conEliminar) {
      visibles.push(['Eliminar', fila.getByRole('button', { name: `Eliminar producto ${producto.nombre}` })]);
    }
    for (const [parte, elemento] of visibles) {
      const seVe = await elemento.isVisible();
      expect.soft(seVe, que(`${parte} visible`)).toBe(true);
      const cajaDelElemento = await caja(elemento);
      expect
        .soft(
          dentro(cajaDelElemento, cajaDeLista),
          que(`${parte} dentro de la lista (${texto(cajaDelElemento)} en ${texto(cajaDeLista)})`),
        )
        .toBe(true);
    }

    const lineas = await lineasDelSku(fila, producto.sku);
    expect.soft(lineas, que('líneas del SKU')).toBe(1);

    const hijos = await hijosDeFila(fila);
    expect(hijos, que('hijos directos de la fila')).toHaveLength(4);
    const [bloque, precio, stock, acciones] = hijos;
    const partes: [string, HijoDeFila][] = [
      ['bloque del producto', bloque],
      ['precio', precio],
      ['stock', stock],
      ['acciones', acciones],
    ];
    for (const [parte, hijo] of partes) {
      expect
        .soft(
          hijo.caja.width > 0 && hijo.caja.height > 0 && dentro(hijo.caja, cajaDeLista),
          que(`${parte} visible y dentro de la lista (${texto(hijo.caja)} en ${texto(cajaDeLista)})`),
        )
        .toBe(true);
    }
    for (let i = 0; i < partes.length; i++) {
      for (let j = i + 1; j < partes.length; j++) {
        expect
          .soft(
            solapan(partes[i][1].caja, partes[j][1].caja),
            que(
              `${partes[i][0]} (${texto(partes[i][1].caja)}) no se solapa con ${partes[j][0]} (${texto(partes[j][1].caja)})`,
            ),
          )
          .toBe(false);
      }
    }
    expect.soft(stock.texto, que('celda del stock')).toMatch(STOCK_CON_ETIQUETA);

    if (producto.sinStock) {
      expect.soft(stock.texto, que('celda del stock sin unidades')).toBe('Stock 0');
      const numero = fila.getByText('0', { exact: true });
      await expect(numero).toHaveCount(1);
      const color = await numero.evaluate((nodo) => getComputedStyle(nodo).color);
      expect.soft(color, que('color del 0 del stock (--ws-danger)')).toBe(colorPeligro);
    }
  }

  if (!conEliminar) {
    // Lote 07 (PBI-0013): el vendedor crea productos («Nuevo producto»), pero no los elimina.
    await expect(page.getByRole('button', { name: /^Eliminar producto/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Nuevo producto', exact: true })).toBeVisible();
  }
}

/** Pulsa «Editar» en una fila, espera `/productos/:id` y el formulario «Editar producto». No guarda. */
async function editarProducto(page: Page, nombre: string): Promise<Locator> {
  const editar = filaDe(page, nombre).getByRole('link', { name: /^Editar / });
  await editar.evaluate((nodo) => nodo.scrollIntoView({ block: 'center' }));
  await editar.click();
  await expect(page).toHaveURL(/\/productos\/(?!nuevo)[^/?]+$/);
  const formulario = page.getByRole('form', { name: 'Editar producto' });
  await expect(formulario).toBeVisible();
  return formulario;
}

type RolDeCampo = Parameters<Page['getByRole']>[0];

const CAMPOS: readonly (readonly [RolDeCampo, string])[] = [
  ['textbox', 'Nombre'],
  ['textbox', 'SKU'],
  ['textbox', 'Descripción'],
  ['textbox', 'Imagen principal'],
  ['textbox', 'Miniatura optimizada'],
  ['textbox', 'URL de foto'],
  ['textbox', 'Características (una por línea)'],
  ['spinbutton', 'Precio'],
  ['spinbutton', 'Stock'],
  ['combobox', 'Categoría'],
  ['combobox', 'Marca'],
  ['checkbox', 'Activo'],
];

/** TEST-02: el formulario «Nuevo producto» y sus piezas dentro de su caja. */
async function comprobarFormularioNuevo(page: Page, lugar: Lugar): Promise<void> {
  const formulario = page.getByRole('form', { name: 'Nuevo producto' });
  await expect(formulario).toBeVisible();
  const cajaDelFormulario = await caja(formulario);
  const que = (parte: string) => etiqueta(lugar, `formulario Nuevo producto · ${parte}`);

  for (const [rol, nombre] of CAMPOS) {
    const control = formulario.getByRole(rol, { name: nombre, exact: true });
    const cajaDelCampo = await control.evaluate((nodo) => {
      const campo = nodo.closest('mat-form-field') ?? nodo.closest('mat-checkbox');
      if (!campo) throw new Error('El control no está en un mat-form-field ni en un mat-checkbox');
      const { left, top, right, bottom, width, height } = campo.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    });
    expect
      .soft(
        dentro(cajaDelCampo, cajaDelFormulario),
        que(`campo «${nombre}» dentro (${texto(cajaDelCampo)} en ${texto(cajaDelFormulario)})`),
      )
      .toBe(true);
  }

  const galeria = formulario.getByRole('group', { name: 'Galería de fotos' });
  const piezas: [string, Locator][] = [
    ['grupo «Galería de fotos»', galeria],
    ['botón «Agregar»', formulario.getByRole('button', { name: 'Agregar', exact: true })],
    ['texto «Cargar foto»', formulario.getByText('Cargar foto', { exact: true })],
    ['botón «Guardar producto»', formulario.getByRole('button', { name: 'Guardar producto' })],
  ];
  for (const [parte, pieza] of piezas) {
    const cajaDeLaPieza = await caja(pieza);
    expect
      .soft(
        dentro(cajaDeLaPieza, cajaDelFormulario),
        que(`${parte} dentro (${texto(cajaDeLaPieza)} en ${texto(cajaDelFormulario)})`),
      )
      .toBe(true);
  }

  const ayuda = await caja(formulario.getByText(AYUDA_MINIATURA));
  const leyenda = await caja(formulario.getByText('Galería de fotos', { exact: true }));
  expect
    .soft(
      ayuda.bottom <= leyenda.top + TOLERANCIA,
      que(
        `ayuda de la miniatura (bottom ${ayuda.bottom.toFixed(1)}) sobre la leyenda (top ${leyenda.top.toFixed(1)})`,
      ),
    )
    .toBe(true);
}

/** TEST-02: edita el producto con galería, añade una foto y repite la URL; sin guardar. */
async function comprobarGaleria(page: Page, lugar: Lugar): Promise<void> {
  const formulario = await editarProducto(page, PRODUCTO_CON_GALERIA);
  await comprobarSinDesborde(page, lugar, 'editando');

  const galeria = formulario.getByRole('group', { name: 'Galería de fotos' });
  const urlDeFoto = formulario.getByRole('textbox', { name: 'URL de foto', exact: true });
  const agregar = formulario.getByRole('button', { name: 'Agregar', exact: true });
  const que = (parte: string) => etiqueta(lugar, `galería · ${parte}`);

  // La tuerca «Cambiar tema» del modo demo está fija abajo a la derecha: «Agregar» se lleva al centro de la vista.
  const pulsarAgregar = async () => {
    await agregar.evaluate((nodo) => nodo.scrollIntoView({ block: 'center' }));
    await agregar.click();
  };

  await urlDeFoto.fill(FOTO_NUEVA);
  await pulsarAgregar();
  const piezas: [string, Locator][] = [
    ['imagen «Foto 2 del producto»', galeria.getByRole('img', { name: 'Foto 2 del producto' })],
    ['imagen «Foto 3 del producto»', galeria.getByRole('img', { name: 'Foto 3 del producto' })],
    ['botón «Quitar foto 2»', galeria.getByRole('button', { name: 'Quitar foto 2' })],
    ['botón «Quitar foto 3»', galeria.getByRole('button', { name: 'Quitar foto 3' })],
  ];
  await expect(piezas[1][1]).toBeVisible();
  const cajaDeLaGaleria = await caja(galeria);
  for (const [parte, pieza] of piezas) {
    const cajaDeLaPieza = await caja(pieza);
    expect
      .soft(
        dentro(cajaDeLaPieza, cajaDeLaGaleria),
        que(`${parte} dentro (${texto(cajaDeLaPieza)} en ${texto(cajaDeLaGaleria)})`),
      )
      .toBe(true);
  }
  await comprobarSinDesborde(page, lugar, 'editando con tres fotos');

  await urlDeFoto.fill(FOTO_NUEVA);
  await pulsarAgregar();
  const aviso = galeria.getByRole('alert');
  await expect(aviso).toHaveText(AVISO_FOTO_REPETIDA);
  await expect(aviso).toBeVisible();
  const cajaDelAviso = await caja(aviso);
  const cajaFinal = await caja(galeria);
  expect
    .soft(
      dentro(cajaDelAviso, cajaFinal),
      que(`aviso de foto repetida dentro (${texto(cajaDelAviso)} en ${texto(cajaFinal)})`),
    )
    .toBe(true);
}

const MOVILES = [360, 375, 390] as const;
const ALTO_MOVIL = 812;

test.describe('Productos del Admin en pantallas estrechas', () => {
  test.afterAll(() => restablecerTemas());

  for (const tema of TEMAS) {
    test(`TEST-01 a TEST-03 · tema ${tema.toUpperCase()}`, async ({ page }) => {
      test.setTimeout(240_000);
      await activarTema(tema);
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);

      for (const ancho of MOVILES) {
        const lugar = { tema: tema.toUpperCase(), ancho };
        await abrirProductos(page, ancho, ALTO_MOVIL);
        await comprobarSinDesborde(page, lugar, 'al entrar');
        await comprobarLista(page, lugar, true);
        await abrirNuevoProducto(page);
        await comprobarFormularioNuevo(page, lugar);
        await abrirProductos(page, ancho, ALTO_MOVIL);
        await comprobarGaleria(page, lugar);
      }
    });
  }

  test('TEST-04 · vendedor con B a 375 px', async ({ page }) => {
    test.setTimeout(120_000);
    const tema: Tema = 'b';
    await activarTema(tema);
    await ingresarAlAdmin(page, cuentasAdmin.vendedor);

    const lugar = { tema: 'B (vendedor)', ancho: 375 };
    await abrirProductos(page, lugar.ancho, ALTO_MOVIL);
    await comprobarSinDesborde(page, lugar, 'al entrar');
    await comprobarLista(page, lugar, false);

    const nombreDelPrimero = PRODUCTOS[0].nombre;
    await editarProducto(page, nombreDelPrimero);
    await comprobarSinDesborde(page, lugar, 'editando');
  });

  test('TEST-05 · escritorio con B a 768 y 1440 px', async ({ page }) => {
    test.setTimeout(120_000);
    await activarTema('b');
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);

    for (const [ancho, alto] of [
      [768, 1024],
      [1440, 900],
    ] as const) {
      const lugar = { tema: 'B', ancho };
      await abrirProductos(page, ancho, alto);

      const encabezado = cabecera(page);
      await expect(encabezado).toHaveCount(1);
      expect.soft(await encabezado.isVisible(), etiqueta(lugar, 'cabecera visible')).toBe(true);
      for (const titulo of ['Producto', 'Precio', 'Stock']) {
        expect
          .soft(
            await encabezado.getByText(titulo, { exact: true }).isVisible(),
            etiqueta(lugar, `cabecera · «${titulo}» visible`),
          )
          .toBe(true);
      }

      for (const producto of PRODUCTOS) {
        const fila = filaDe(page, producto.nombre);
        await expect(fila).toHaveCount(1);
        const que = (parte: string) => etiqueta(lugar, `${producto.nombre} · ${parte}`);
        const hijos = await hijosDeFila(fila);
        expect(hijos, que('hijos directos de la fila')).toHaveLength(4);
        const [bloque, precio, stock, acciones] = hijos;
        // El bloque del producto tiene dos líneas (nombre y SKU) y el resto de la fila se centra sobre él
        // (`items-center`): el centro del nombre queda media línea por encima, así que el precio, el stock y las
        // acciones se comparan con el centro del bloque (menos de 2 px) y, además, deben caer en la franja
        // vertical del nombre, es decir, en su misma línea.
        const cajaDelNombre = await caja(fila.getByText(producto.nombre, { exact: true }));
        const alineados: [string, Caja][] = [
          ['precio', precio.caja],
          ['stock', stock.caja],
          ['acciones', acciones.caja],
        ];
        for (const [parte, cajaDeLaParte] of alineados) {
          const centro = centroY(cajaDeLaParte);
          const diferencia = Math.abs(centro - centroY(bloque.caja));
          expect
            .soft(
              diferencia < 2,
              que(
                `${parte} centrado en el bloque del producto (centro ${centro.toFixed(1)} frente a ${centroY(bloque.caja).toFixed(1)})`,
              ),
            )
            .toBe(true);
          expect
            .soft(
              centro >= cajaDelNombre.top - TOLERANCIA && centro <= cajaDelNombre.bottom + TOLERANCIA,
              que(
                `${parte} en la línea del nombre (centro ${centro.toFixed(1)} en y ${cajaDelNombre.top.toFixed(1)}–${cajaDelNombre.bottom.toFixed(1)})`,
              ),
            )
            .toBe(true);
        }
        expect.soft(stock.texto, que('celda del stock')).toMatch(STOCK_SOLO_NUMERO);
      }

      await abrirNuevoProducto(page);
      const formulario = page.getByRole('form', { name: 'Nuevo producto' });
      const lineas = await lineasDeTexto(formulario.getByText(AYUDA_MINIATURA));
      expect.soft(lineas, etiqueta(lugar, 'líneas de la ayuda de la miniatura')).toBe(1);
    }
  });

  test('TEST-05 · punto de corte con B a 767 px', async ({ page }) => {
    test.setTimeout(120_000);
    await activarTema('b');
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);

    const lugar = { tema: 'B', ancho: 767 };
    await abrirProductos(page, lugar.ancho, 1024);
    const encabezado = cabecera(page);
    await expect(encabezado).toHaveCount(1);
    expect.soft(await encabezado.isVisible(), etiqueta(lugar, 'cabecera oculta')).toBe(false);
    for (const producto of PRODUCTOS) {
      const hijos = await hijosDeFila(filaDe(page, producto.nombre));
      expect(hijos).toHaveLength(4);
      expect
        .soft(hijos[2].texto, etiqueta(lugar, `${producto.nombre} · celda del stock`))
        .toMatch(STOCK_CON_ETIQUETA);
    }
  });
});
