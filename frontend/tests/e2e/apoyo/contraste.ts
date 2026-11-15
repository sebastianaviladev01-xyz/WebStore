import { expect, request as nuevoRequest, test, type Locator, type Page } from '@playwright/test';

import { cuentasAdmin, urls } from './entorno';
import {
  SALTO,
  aRgb,
  bordeIzquierdo,
  capturar,
  distancia,
  masDistinto,
  rectangulo,
  type Pixel,
} from './pintado';

/**
 * Apoyo de las e2e de contraste (feature 005: TEST-10 a TEST-12). Las pruebas leen colores con `getComputedStyle`
 * y calculan la relación WCAG 2.x aquí, en Node: no importan código del BFF. Localizan cada control por su rol y su
 * nombre. Lo que Material dibuja por dentro (la marca de la casilla, el punto del botón de opción, la marca de la
 * opción seleccionada, la capa de estado) se mide por lo que se pinta, leyendo píxeles (`apoyo/pintado.ts`, como
 * `apoyo/campos.ts`), nunca por su estructura ni por clases `mdc-*` (STD-04, PBI-0050, PBI-0164).
 */

/** Temas predefinidos, en el orden en que se recorren. */
export const TEMAS = ['a', 'b', 'c'] as const;
export type Tema = (typeof TEMAS)[number];

/** Casilla marcada del Admin: la marca usa `--ws-on-link` y el relleno, el enlace (`--mat-sys-primary`). */
export const COLORES_SOBRE_EL_ENLACE = {
  a: { marca: 'rgb(255, 255, 255)', relleno: 'rgb(76, 42, 146)' },
  b: { marca: 'rgb(255, 255, 255)', relleno: 'rgb(29, 78, 216)' },
  c: { marca: 'rgb(255, 255, 255)', relleno: 'rgb(31, 35, 40)' },
} as const;

/** Mínimos de WCAG 2.x: texto normal (1.4.3) y partes gráficas de un control (1.4.11). */
export const MINIMO = { texto: 4.5, marca: 3 } as const;

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Interpreta `rgb()`, `rgba()` y `color(srgb …)`, que es como Chrome devuelve un `color-mix()`. */
function aRgba(color: string): Rgba {
  const srgb = /color\(srgb ([^)]+)\)/.exec(color);
  if (srgb) {
    const [r, g, b, a = 1] = srgb[1].split(/[ /]+/).filter(Boolean).map(Number);
    return { r: r * 255, g: g * 255, b: b * 255, a };
  }
  const rgb = /rgba?\(([^)]+)\)/.exec(color);
  if (!rgb) throw new Error(`Color sin interpretar: «${color}»`);
  const [r, g, b, a = 1] = rgb[1]
    .split(/[ ,/]+/)
    .filter(Boolean)
    .map(Number);
  return { r, g, b, a };
}

/** Pinta `encima` sobre `debajo` (composición alfa). */
function sobre(encima: Rgba, debajo: Rgba): Rgba {
  const mezcla = (x: number, y: number) => x * encima.a + y * (1 - encima.a);
  return {
    r: mezcla(encima.r, debajo.r),
    g: mezcla(encima.g, debajo.g),
    b: mezcla(encima.b, debajo.b),
    a: 1,
  };
}

function luminancia({ r, g, b }: Rgba): number {
  const canal = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

const aTexto = ({ r, g, b }: Rgba) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

/**
 * Relación de contraste WCAG entre dos colores calculados por el navegador. Si el primer plano es
 * translúcido, se compone antes sobre el fondo. Sin redondear: las aserciones comparan con el mínimo exacto.
 */
export function relacionDeContraste(primerPlano: string, fondo: string): number {
  const debajo = aRgba(fondo);
  if (debajo.a < 1) throw new Error(`El fondo debe ser opaco: «${fondo}»`);
  const [x, y] = [luminancia(sobre(aRgba(primerPlano), debajo)), luminancia(debajo)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Un color opaco calculado por el navegador (`rgb()` o `color(srgb …)`), como `rgb()` para compararlo. */
export function enRgb(color: string): string {
  return aTexto(aRgba(color));
}

/**
 * Fondo que se ve detrás del elemento: compone los `background-color` del elemento y de sus antecesores hasta el
 * primero opaco, sobre blanco. Se evalúa en la página con `locator.evaluate(capasDeFondo)`.
 */
export function capasDeFondo(elemento: Element): string[] {
  const capas: string[] = [];
  for (let nodo: Element | null = elemento; nodo; nodo = nodo.parentElement) {
    capas.push(getComputedStyle(nodo).backgroundColor);
  }
  return capas;
}

export function fondoEfectivo(capas: readonly string[]): string {
  let fondo: Rgba = { r: 255, g: 255, b: 255, a: 1 };
  const visibles: Rgba[] = [];
  for (const capa of capas) {
    const color = aRgba(capa);
    if (color.a > 0) visibles.push(color);
    if (color.a === 1) break;
  }
  for (const color of visibles.reverse()) fondo = sobre(color, fondo);
  return aTexto(fondo);
}

/** Fondo efectivo detrás de un elemento de la página. */
export async function fondoDe(elemento: Locator): Promise<string> {
  return fondoEfectivo(await elemento.evaluate(capasDeFondo));
}

/**
 * Color calculado de un token del tema activo, como `rgb()`: una sonda con `color: var(token)`. Con
 * `{ crudo: true }`, tal como lo da `getComputedStyle` (un `color-mix()` llega como `color(srgb …)`), para
 * compararlo con `toHaveCSS`.
 */
export async function colorDelToken(page: Page, token: string, { crudo = false } = {}): Promise<string> {
  const color = await page.evaluate((nombre) => {
    const sonda = document.createElement('span');
    sonda.style.color = `var(${nombre})`;
    document.body.appendChild(sonda);
    const color = getComputedStyle(sonda).color;
    sonda.remove();
    return color;
  }, token);
  // Un token con `color-mix()` llega como `color(srgb …)`: se pasa a `rgb()` para compararlo con un color medido.
  return crudo ? color : aTexto(aRgba(color));
}

/** Espera a que terminen las animaciones y transiciones en curso (casillas, menús, diálogos). */
export async function asentar(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((animacion) => animacion.finished.catch(() => undefined))),
  );
}

/** Color del primer texto visible dentro del elemento y fondo efectivo detrás de ese texto. */
export async function medirTexto(elemento: Locator): Promise<{ color: string; fondo: string }> {
  await asentar(elemento.page());
  const { color, capas } = await elemento.evaluate((raiz) => {
    const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: (nodo) => (nodo.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
    });
    const texto = recorrido.nextNode()?.parentElement ?? raiz;
    const fondos: string[] = [];
    for (let nodo: Element | null = texto; nodo; nodo = nodo.parentElement) {
      fondos.push(getComputedStyle(nodo).backgroundColor);
    }
    return { color: getComputedStyle(texto).color, capas: fondos };
  });
  return { color, fondo: fondoEfectivo(capas) };
}

/** Etiqueta flotante de un campo de Material: la `label` asociada al control, enfocado. */
export async function medirEtiquetaEnfocada(control: Locator): Promise<{ color: string; fondo: string }> {
  await control.focus();
  await expect(control).toBeFocused();
  await asentar(control.page());
  const { color, capas } = await control.evaluate((campo) => {
    const etiqueta = (campo as HTMLInputElement).labels?.[0];
    if (!etiqueta) throw new Error('El campo no tiene etiqueta asociada');
    const fondos: string[] = [];
    for (let nodo: Element | null = etiqueta; nodo; nodo = nodo.parentElement) {
      fondos.push(getComputedStyle(nodo).backgroundColor);
    }
    return { color: getComputedStyle(etiqueta).color, capas: fondos };
  });
  return { color, fondo: fondoEfectivo(capas) };
}

/**
 * Opción seleccionada de una lista desplegable abierta: su texto y su marca (la marca de selección que Material
 * dibuja), sobre el fondo de la opción. El texto y el fondo salen de los estilos calculados; la marca, de los
 * píxeles de la opción fuera del texto: el más distinto del fondo es el trazo de la marca.
 */
export async function medirOpcionSeleccionada(
  opcion: Locator,
): Promise<{ texto: string; marca: string; fondo: string }> {
  const texto = await medirTexto(opcion);
  const cajaDelTexto = await opcion.evaluate((raiz) => {
    const rango = document.createRange();
    const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: (nodo) => (nodo.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
    });
    const origen = raiz.getBoundingClientRect();
    const cajas: { x0: number; y0: number; x1: number; y1: number }[] = [];
    for (let nodo = recorrido.nextNode(); nodo; nodo = recorrido.nextNode()) {
      rango.selectNodeContents(nodo);
      const { left, top, right, bottom } = rango.getBoundingClientRect();
      cajas.push({
        x0: left - origen.left,
        y0: top - origen.top,
        x1: right - origen.left,
        y1: bottom - origen.top,
      });
    }
    if (!cajas.length) return null;
    return {
      x0: Math.min(...cajas.map((caja) => caja.x0)),
      y0: Math.min(...cajas.map((caja) => caja.y0)),
      x1: Math.max(...cajas.map((caja) => caja.x1)),
      y1: Math.max(...cajas.map((caja) => caja.y1)),
    };
  });
  if (!cajaDelTexto) throw new Error('La opción no tiene texto');
  const imagen = await capturar(opcion);
  const fondo = imagen.pixel(2, 2);
  const fueraDelTexto: Pixel[] = [];
  for (let y = 0; y < imagen.alto; y++) {
    for (let x = 0; x < imagen.ancho; x++) {
      const dentro =
        x >= cajaDelTexto.x0 - 2 &&
        x <= cajaDelTexto.x1 + 2 &&
        y >= cajaDelTexto.y0 - 2 &&
        y <= cajaDelTexto.y1 + 2;
      if (!dentro) fueraDelTexto.push(imagen.pixel(x, y));
    }
  }
  const marca = masDistinto(fondo, fueraDelTexto);
  if (distancia(marca, fondo) < SALTO) throw new Error('La opción no muestra una marca de selección');
  return { texto: texto.color, marca: aRgb(marca), fondo: texto.fondo };
}

/**
 * Botón de opción de Material marcado, por lo que se ve: el punto es el color del centro del control, el anillo el
 * del primer borde que se cruza yendo desde la izquierda por la fila central, y el fondo, la esquina de la captura.
 */
export async function medirBotonDeOpcion(
  radio: Locator,
): Promise<{ punto: string; anillo: string; fondo: string }> {
  await radio.scrollIntoViewIfNeeded();
  await radio.page().mouse.move(0, 0);
  await asentar(radio.page());
  const imagen = await capturar(radio);
  const [cx, cy] = [Math.floor(imagen.ancho / 2), Math.floor(imagen.alto / 2)];
  const fondo = imagen.pixel(0, 0);
  const borde = bordeIzquierdo(imagen, cy, cx, 'el botón de opción');
  const anillo = masDistinto(
    fondo,
    [0, 1, 2].map((paso) => imagen.pixel(borde + paso, cy)),
  );
  return { punto: aRgb(imagen.pixel(cx, cy)), anillo: aRgb(anillo), fondo: aRgb(fondo) };
}

/**
 * Relleno de un botón de Material, por lo que se ve, en reposo y con el puntero encima: el color de un píxel
 * dentro del botón, junto a su borde izquierdo y fuera del texto. La diferencia entre los dos es la capa de estado.
 */
export async function medirBotonConPuntero(boton: Locator): Promise<{ reposo: string; conPuntero: string }> {
  const page = boton.page();
  await boton.blur();
  await page.mouse.move(0, 0);
  await asentar(page);
  const enReposo = await capturar(boton);
  await boton.hover();
  await asentar(page);
  const conElPuntero = await capturar(boton);
  const [x, y] = [10, Math.floor(enReposo.alto / 2)];
  return { reposo: aRgb(enReposo.pixel(x, y)), conPuntero: aRgb(conElPuntero.pixel(x, y)) };
}

/** `true` si cada canal de `medido` está a 1 o menos del de `esperado`: un `color-mix()` y su píxel difieren por el redondeo. */
export function mismoColor(medido: string, esperado: string): boolean {
  const [a, b] = [aRgba(medido), aRgba(esperado)];
  return Math.abs(a.r - b.r) <= 1 && Math.abs(a.g - b.g) <= 1 && Math.abs(a.b - b.b) <= 1;
}

/** `true` si `color` está entre `desde` y `hasta` en cada canal (con 1 de margen): lo que resulta de mezclar uno con otro. */
export function estaEntre(color: string, desde: string, hasta: string): boolean {
  const [c, d, h] = [aRgba(color), aRgba(desde), aRgba(hasta)];
  return (['r', 'g', 'b'] as const).every(
    (canal) => c[canal] >= Math.min(d[canal], h[canal]) - 1 && c[canal] <= Math.max(d[canal], h[canal]) + 1,
  );
}

export interface MedidaCasilla {
  marca: string;
  relleno: string;
  borde: string;
  tarjeta: string;
}

/**
 * Colores de una casilla de Material, localizada por su rol y su nombre (el `input`), por lo que se ve. La captura
 * del control (con el puntero y el foco fuera) da la tarjeta en su esquina; el recuadro empieza en el primer salto
 * de color de la fila central; el borde es el píxel más distinto de la tarjeta junto a ese salto; el relleno, un
 * píxel dentro del recuadro, lejos de la marca; y la marca, el píxel más distinto del relleno dentro del recuadro.
 * Una casilla sin marcar no tiene relleno (sale igual que la tarjeta).
 */
export async function medirCasilla(casilla: Locator): Promise<MedidaCasilla> {
  await casilla.scrollIntoViewIfNeeded();
  await casilla.page().mouse.move(0, 0);
  await asentar(casilla.page());
  const imagen = await capturar(casilla);
  const [cx, cy] = [Math.floor(imagen.ancho / 2), Math.floor(imagen.alto / 2)];
  const tarjeta = imagen.pixel(0, 0);
  const izquierda = bordeIzquierdo(imagen, cy, cx, 'la casilla');
  const lado = cx - izquierda;
  const arriba = cy - lado;
  const relleno = imagen.pixel(izquierda + 3, arriba + 3);
  const interior = rectangulo(
    imagen,
    izquierda + 3,
    arriba + 3,
    izquierda + 2 * lado - 3,
    arriba + 2 * lado - 3,
  );
  return {
    marca: aRgb(masDistinto(relleno, interior)),
    relleno: aRgb(relleno),
    borde: aRgb(
      masDistinto(
        tarjeta,
        [0, 1, 2].map((paso) => imagen.pixel(izquierda + paso, cy)),
      ),
    ),
    tarjeta: aRgb(tarjeta),
  };
}

/** Deja una medida en el informe de la prueba (AC-06: la verificación lista cada una). */
export function anotar(
  tema: string,
  componente: string,
  primerPlano: string,
  fondo: string,
  minimo: number,
): number {
  const relacion = relacionDeContraste(primerPlano, fondo);
  test.info().annotations.push({
    type: 'contraste',
    description: `${tema.toUpperCase()} · ${componente}: ${primerPlano} sobre ${fondo} = ${relacion.toFixed(2)}:1 (mínimo ${minimo}:1)`,
  });
  return relacion;
}

/** Anota y exige el mínimo. */
export function exigir(
  tema: string,
  componente: string,
  primerPlano: string,
  fondo: string,
  minimo: number,
): void {
  const relacion = anotar(tema, componente, primerPlano, fondo, minimo);
  expect(relacion, `${tema.toUpperCase()} · ${componente}`).toBeGreaterThanOrEqual(minimo);
}

interface TemaDto {
  id: string;
  name: string;
  kind: 'predefined' | 'custom';
}

/** Sesión del `superadmin` contra la API del Admin, para activar y preparar temas sin pasar por la interfaz. */
async function conApi<T>(
  accion: (
    api: Awaited<ReturnType<typeof nuevoRequest.newContext>>,
    headers: Record<string, string>,
  ) => Promise<T>,
): Promise<T> {
  const api = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    const sesion = await api.post('/bff/admin/sessions', {
      data: { email: cuentasAdmin.superadmin.email, password: cuentasAdmin.superadmin.password },
    });
    expect(sesion.ok()).toBe(true);
    return await accion(api, { authorization: `Bearer ${(await sesion.json()).token}` });
  } finally {
    await api.dispose();
  }
}

async function revision(
  api: Awaited<ReturnType<typeof nuevoRequest.newContext>>,
  headers: Record<string, string>,
): Promise<{ revision: number; activeThemeId: string; themes: TemaDto[] }> {
  const respuesta = await api.get('/bff/admin/themes', { headers });
  expect(respuesta.ok()).toBe(true);
  return respuesta.json();
}

/** Activa un tema por la API del Admin, como `storefront-temas.spec.ts`. */
export async function activarTema(themeId: string): Promise<void> {
  await conApi(async (api, headers) => {
    const { revision: actual } = await revision(api, headers);
    const activado = await api.put('/bff/admin/active-theme', {
      headers,
      data: { revision: actual, themeId },
    });
    expect(activado.ok()).toBe(true);
  });
}

/** Crea un tema propio y devuelve su id. */
export async function crearTemaPropio(name: string, colors: Record<string, string>): Promise<string> {
  return conApi(async (api, headers) => {
    const { revision: actual } = await revision(api, headers);
    const creado = await api.post('/bff/admin/themes', { headers, data: { revision: actual, name, colors } });
    expect(creado.ok()).toBe(true);
    const vista = (await creado.json()) as { themes: TemaDto[] };
    return vista.themes.find((tema) => tema.name === name)!.id;
  });
}

/** Deja B activo y borra los temas propios cuyo nombre empieza por `prefijo`. */
export async function restablecerTemas(prefijo?: string): Promise<void> {
  await conApi(async (api, headers) => {
    let vista = await revision(api, headers);
    if (vista.activeThemeId !== 'b') {
      const activado = await api.put('/bff/admin/active-theme', {
        headers,
        data: { revision: vista.revision, themeId: 'b' },
      });
      expect(activado.ok()).toBe(true);
    }
    if (!prefijo) return;
    vista = await revision(api, headers);
    for (const tema of vista.themes) {
      if (tema.kind !== 'custom' || !tema.name.startsWith(prefijo)) continue;
      const { revision: actual } = await revision(api, headers);
      const borrado = await api.delete(`/bff/admin/themes/${tema.id}?revision=${actual}`, { headers });
      expect(borrado.ok()).toBe(true);
    }
  });
}
