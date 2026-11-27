import { expect, test, type Page } from '@playwright/test';

import { cuentasAdmin, ingresarAlAdmin, menuAdmin } from './apoyo/entorno';
import { abrirVentana, campoNombre } from './apoyo/ventanas';

/**
 * Íconos de los botones y de los títulos del backoffice (lote 31, ADR-0027, PBI-0243; provisional, por confirmar con
 * Daniel). Daniel, sobre las capturas de SGC (2026-11-20): «¿Ves que los iconos de todos los botones están siempre a la
 * izquierda?» y «el icono aquí del módulo como tal».
 *
 * - Cada botón con texto visible (también los enlaces con forma de botón, las opciones de los menús y las etiquetas que
 *   cargan un archivo) lleva un ícono decorativo (`aria-hidden`) a la izquierda de su texto, del mismo tamaño en todo
 *   el backoffice. No se revisan el menú lateral, que ya tiene los suyos, ni lo marcado con `data-sin-icono`, que dice
 *   en la plantilla por qué no lo lleva (un identificador, una fila, un enlace de texto, la marca…). Un botón que
 *   despliega algo (`aria-expanded`) y ya lleva su flecha no cambia.
 * - El `h1` de cada página lleva a la izquierda el ícono de su módulo, el mismo trazo que su entrada del menú lateral;
 *   su nombre accesible no cambia.
 * - A 375 px, ningún botón con ícono parte su texto en dos líneas ni se desborda; a 1440 y a 375 px, ninguna caja recorta
 *   un botón con ícono (como la columna de acciones de una lista) ni la página se desborda a lo ancho.
 */

interface Pagina {
  readonly ruta: string;
  readonly titulo: string;
  /** Entrada del menú lateral cuyo ícono lleva el título; sin ella, la página no está en el menú (Perfil). */
  readonly modulo?: string;
}

const PAGINAS: readonly Pagina[] = [
  { ruta: '/', titulo: 'Dashboard de la tienda', modulo: 'Dashboard' },
  { ruta: '/productos', titulo: 'Productos', modulo: 'Productos' },
  { ruta: '/productos/nuevo', titulo: 'Nuevo producto', modulo: 'Productos' },
  { ruta: '/productos/p-004', titulo: 'Editar producto', modulo: 'Productos' },
  { ruta: '/inventario', titulo: 'Inventario', modulo: 'Inventario' },
  { ruta: '/categorias', titulo: 'Categorías', modulo: 'Categorías' },
  { ruta: '/categorias/nueva', titulo: 'Nueva categoría', modulo: 'Categorías' },
  { ruta: '/marcas', titulo: 'Marcas', modulo: 'Marcas' },
  { ruta: '/pedidos', titulo: 'Pedidos', modulo: 'Pedidos' },
  { ruta: '/clientes', titulo: 'Clientes', modulo: 'Clientes' },
  { ruta: '/reclamaciones', titulo: 'Reclamaciones', modulo: 'Reclamaciones' },
  { ruta: '/banners', titulo: 'Banners y campañas', modulo: 'Banners' },
  { ruta: '/banners/nuevo', titulo: 'Nuevo banner', modulo: 'Banners' },
  { ruta: '/contenido', titulo: 'Contenido y configuración', modulo: 'Contenido' },
  { ruta: '/entregas', titulo: 'Entregas y feriados', modulo: 'Entregas y feriados' },
  { ruta: '/temas', titulo: 'Temas', modulo: 'Temas' },
  { ruta: '/envios', titulo: 'Tarifas de envío', modulo: 'Tarifas de envío' },
  { ruta: '/usuarios', titulo: 'Usuarios y roles', modulo: 'Usuarios y roles' },
  { ruta: '/usuarios/nuevo', titulo: 'Nuevo usuario', modulo: 'Usuarios y roles' },
  { ruta: '/perfil', titulo: 'Perfil' },
];

/** Lo que encontró la revisión de los botones visibles de la página. */
interface Revision {
  /** Botones con texto y sin ícono decorativo a la izquierda. */
  readonly sinIcono: string[];
  /** Botones con ícono cuyo texto ocupa más de una línea o que se desbordan (solo se mira si se pide). */
  readonly partidos: string[];
  /** Botones con ícono que una caja con `overflow` oculto recorta, y la página si se desborda a lo ancho. */
  readonly cortados: string[];
  /** Tamaños distintos de los íconos de los botones (ancho × alto). */
  readonly tamanos: string[];
}

/**
 * Revisa los botones visibles de la página. Se ejecuta en el navegador: mide lo que se ve (rectángulos del texto y del
 * ícono), sin clases de Material.
 */
function revisarBotones(page: Page, mirarLineas: boolean): Promise<Revision> {
  return page.evaluate((mirarLineas) => {
    const visible = (el: Element) =>
      el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true }) && el.getClientRects().length > 0;
    /** Si el texto está dentro de una caja recortada a 1 px: el texto solo para lectores de pantalla. */
    const recortado = (nodo: Node, el: Element) => {
      for (let caja = nodo.parentElement; caja && caja !== el; caja = caja.parentElement) {
        const { width, height } = caja.getBoundingClientRect();
        if (width <= 1 || height <= 1) return true;
      }
      return false;
    };
    /** Rectángulos de las líneas de texto que se ven (sin el texto solo para lectores de pantalla). */
    const rectangulosDeTexto = (el: Element) => {
      const rects: DOMRect[] = [];
      const textos: string[] = [];
      const recorrido = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let nodo = recorrido.nextNode(); nodo; nodo = recorrido.nextNode()) {
        if (!nodo.textContent?.trim() || recortado(nodo, el)) continue;
        const rango = document.createRange();
        rango.selectNodeContents(nodo);
        const propios = [...rango.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
        if (propios.length) {
          rects.push(...propios);
          textos.push(nodo.textContent.trim());
        }
      }
      return { rects, texto: textos.join(' ') };
    };
    const candidatos = new Set(
      document.querySelectorAll(
        'button, a[href], [role="button"], [role="menuitem"], [role="menuitemradio"], label:has(input[type="file"])',
      ),
    );
    /** Si una caja que recorta lo que sobra (`overflow` oculto, no desplazable) deja fuera parte del botón. */
    const cortado = (el: Element) => {
      const caja = el.getBoundingClientRect();
      for (let padre = el.parentElement; padre; padre = padre.parentElement) {
        const desborde = getComputedStyle(padre).overflowX;
        // Dentro de una caja que se desplaza (una tabla ancha a 375 px), lo que no se ve se alcanza desplazándola.
        if (desborde === 'auto' || desborde === 'scroll') return false;
        if (desborde !== 'hidden' && desborde !== 'clip') continue;
        const borde = padre.getBoundingClientRect();
        if (caja.left < borde.left - 1 || caja.right > borde.right + 1) return true;
      }
      return false;
    };
    const sinIcono: string[] = [];
    const partidos: string[] = [];
    const cortados: string[] = [];
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      cortados.push('la página se desborda a lo ancho');
    const tamanos = new Set<string>();
    for (const el of candidatos) {
      if (!visible(el)) continue;
      if (el.closest('[data-sin-icono]') || el.closest('nav[aria-label="Administración"]')) continue;
      const { rects, texto } = rectangulosDeTexto(el);
      if (!texto) continue;
      // Un enlace dentro de un párrafo es texto, no un botón.
      if (el.tagName === 'A' && el.closest('p')) continue;
      const icono = el.querySelector('svg');
      // Lo que despliega algo y ya lleva su flecha (los grupos del Dashboard, el menú de usuario) no cambia.
      if (el.hasAttribute('aria-expanded') && icono) continue;
      if (!icono || icono.getAttribute('aria-hidden') !== 'true' || !visible(icono)) {
        sinIcono.push(texto);
        continue;
      }
      const caja = icono.getBoundingClientRect();
      const izquierdaDelTexto = Math.min(...rects.map((r) => r.left));
      if (caja.right > izquierdaDelTexto + 1) {
        sinIcono.push(`${texto} (ícono a la derecha)`);
        continue;
      }
      tamanos.add(`${Math.round(caja.width)}×${Math.round(caja.height)}`);
      if (cortado(el)) cortados.push(texto);
      if (mirarLineas) {
        const lineas = new Set(rects.map((r) => Math.round(r.top)));
        const html = el as HTMLElement;
        if (lineas.size > 1 || html.scrollWidth > html.clientWidth + 1) partidos.push(texto);
      }
    }
    return { sinIcono, partidos, cortados, tamanos: [...tamanos] };
  }, mirarLineas);
}

/** Trazo del ícono de una entrada del menú lateral (aunque su grupo esté plegado). */
async function trazoDelMenu(page: Page, entrada: string): Promise<string | null> {
  const enlace = menuAdmin(page)
    .getByRole('link', { name: entrada, exact: true, includeHidden: true })
    .first();
  return enlace.locator('svg path').first().getAttribute('d');
}

/** Comprueba el título de la página: su nombre accesible no cambia y lleva a la izquierda el ícono de su módulo. */
async function comprobarTitulo(page: Page, pagina: Pagina): Promise<void> {
  const titulo = page.getByRole('heading', { level: 1, name: pagina.titulo, exact: true });
  await expect(titulo).toBeVisible();
  const icono = titulo.locator('svg');
  await expect(icono, `ícono del título «${pagina.titulo}»`).toHaveCount(1);
  await expect(icono).toHaveAttribute('aria-hidden', 'true');
  const [cajaIcono, cajaTexto] = await Promise.all([
    icono.boundingBox(),
    titulo.evaluate((h1) => {
      const rango = document.createRange();
      // El primer texto del título, aunque vaya en un span (lote 45: «Dashboard de la tienda», en dos tonos).
      const recorrido = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
      });
      const texto = recorrido.nextNode();
      if (!texto) return null;
      rango.selectNodeContents(texto);
      const { left } = rango.getBoundingClientRect();
      return { left };
    }),
  ]);
  expect(cajaIcono && cajaTexto && cajaIcono.x + cajaIcono.width <= cajaTexto.left + 1).toBe(true);
  if (pagina.modulo) {
    const trazo = await icono.locator('path').first().getAttribute('d');
    expect(trazo, `el título «${pagina.titulo}» lleva el ícono de «${pagina.modulo}»`).toBe(
      await trazoDelMenu(page, pagina.modulo),
    );
  }
}

/** Revisa los botones de la página y falla con la lista de los que no llevan ícono. */
async function comprobarBotones(page: Page, donde: string, mirarLineas = false): Promise<string[]> {
  const revision = await revisarBotones(page, mirarLineas);
  expect(revision.sinIcono, `botones sin ícono a la izquierda en ${donde}`).toEqual([]);
  expect(revision.partidos, `botones partidos o desbordados en ${donde}`).toEqual([]);
  expect(revision.cortados, `botones recortados en ${donde}`).toEqual([]);
  return revision.tamanos;
}

test.describe('íconos del backoffice (PBI-0243)', () => {
  test('el acceso lleva el ícono en su título y en «Ingresar al panel»', async ({ page }) => {
    await page.goto('/login');
    await comprobarTitulo(page, { ruta: '/login', titulo: 'Acceso administrativo' });
    await comprobarBotones(page, '/login');
  });

  test('cada página lleva el ícono de su módulo en el título y un ícono a la izquierda en cada botón', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const tamanos = new Set<string>();
    for (const pagina of PAGINAS) {
      await page.goto(pagina.ruta);
      await comprobarTitulo(page, pagina);
      for (const tamano of await comprobarBotones(page, pagina.ruta)) tamanos.add(tamano);
    }
    // El mismo tamaño en todo el backoffice.
    expect([...tamanos]).toEqual(['18×18']);
  });

  test('los diálogos y los menús también llevan sus íconos', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);

    await page.goto('/temas');
    // PBI-0275: se mide con la ventana ya abierta (Material la escala al abrir) y su foco inicial puesto.
    await abrirVentana(
      page.getByRole('button', { name: 'Nuevo tema', exact: true }),
      'Nuevo tema',
      campoNombre,
    );
    await comprobarBotones(page, 'el diálogo de Temas');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    for (const [ruta, que] of [
      ['/marcas', 'marca'],
      ['/clientes', 'cliente'],
      ['/envios', 'tarifa'],
    ] as const) {
      await page.goto(ruta);
      await abrirVentana(page.getByRole('button', { name: `Agregar ${que}` }), /^(Nueva|Nuevo|Precio)/);
      await comprobarBotones(page, `el registro de ${que}`);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
    }

    await page.goto('/');
    await page.locator('ws-admin-menu-usuario').getByRole('button').click();
    await expect(page.getByRole('menu', { name: 'Cuenta' })).toBeVisible();
    await comprobarBotones(page, 'el menú de usuario');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Cambiar tema' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await comprobarBotones(page, 'el menú «Cambiar tema»');
    await page.keyboard.press('Escape');
  });

  test('a 375 px ningún botón con ícono se parte en dos líneas ni se desborda', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    await comprobarBotones(page, '/login a 375 px', true);
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    for (const pagina of PAGINAS) {
      await page.goto(pagina.ruta);
      await expect(page.getByRole('heading', { level: 1, name: pagina.titulo, exact: true })).toBeVisible();
      await comprobarBotones(page, `${pagina.ruta} a 375 px`, true);
    }
  });
});
