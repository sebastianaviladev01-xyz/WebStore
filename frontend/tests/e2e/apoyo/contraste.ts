import { expect, request as nuevoRequest, test, type Locator, type Page } from '@playwright/test';

import { cuentasAdmin, urls } from './entorno';

/**
 * Apoyo de las e2e de contraste (feature 005: TEST-10 a TEST-12). Las pruebas solo leen colores con
 * `getComputedStyle` y calculan la relación WCAG 2.x aquí, en Node: no importan código del BFF. Localizan cada
 * control por su rol y su nombre y, dentro de los de Material, las piezas por su posición en el DOM, nunca por
 * clases `mdc-*` (STD-04, PBI-0050).
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

/** Color opaco que resulta de `encima` sobre `debajo`, como `rgb()`. */
export function componer(encima: string, debajo: string): string {
  return aTexto(sobre(aRgba(encima), aRgba(debajo)));
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

/** Color calculado de un token del tema activo, como `rgb()`: una sonda con `color: var(token)`. */
export async function colorDelToken(page: Page, token: string): Promise<string> {
  const color = await page.evaluate((nombre) => {
    const sonda = document.createElement('span');
    sonda.style.color = `var(${nombre})`;
    document.body.appendChild(sonda);
    const color = getComputedStyle(sonda).color;
    sonda.remove();
    return color;
  }, token);
  // Un token con `color-mix()` llega como `color(srgb …)`: se pasa a `rgb()` para compararlo con un color medido.
  return aTexto(aRgba(color));
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
 * Opción seleccionada de una lista desplegable abierta: su texto y la marca mínima (el `::after` de
 * `mat-pseudo-checkbox`), sobre el fondo de la opción.
 */
export async function medirOpcionSeleccionada(
  opcion: Locator,
): Promise<{ texto: string; marca: string; fondo: string }> {
  const texto = await medirTexto(opcion);
  const marca = await opcion.evaluate((nodo) => {
    const indicador = nodo.querySelector('mat-pseudo-checkbox');
    if (!indicador) throw new Error('La opción no tiene marca de selección');
    return getComputedStyle(indicador, '::after').color;
  });
  return { texto: texto.color, marca, fondo: texto.fondo };
}

/**
 * Botón de opción de Material marcado: el punto y el anillo, hijos del recuadro que sigue al `input`, sobre el
 * fondo efectivo del contenedor de `mat-radio-button`.
 */
export async function medirBotonDeOpcion(
  radio: Locator,
): Promise<{ punto: string; anillo: string; fondo: string }> {
  await radio.scrollIntoViewIfNeeded();
  await asentar(radio.page());
  const medida = await radio.evaluate((input) => {
    const recuadro = input.nextElementSibling;
    const [anillo, punto] = recuadro ? Array.from(recuadro.children) : [];
    if (!anillo || !punto) throw new Error('El botón de opción no tiene anillo y punto');
    const fondos: string[] = [];
    for (
      let nodo = input.closest('mat-radio-button')?.parentElement ?? null;
      nodo;
      nodo = nodo.parentElement
    ) {
      fondos.push(getComputedStyle(nodo).backgroundColor);
    }
    return {
      punto: getComputedStyle(punto).backgroundColor,
      anillo: getComputedStyle(anillo).borderTopColor,
      capas: fondos,
    };
  });
  return { punto: medida.punto, anillo: medida.anillo, fondo: fondoEfectivo(medida.capas) };
}

/**
 * Capa de estado de un botón de Material con el puntero encima: el `::before` del hijo que la pinta (el primero
 * con contenido y color de fondo), con su opacidad.
 */
export async function medirCapaDeEstado(boton: Locator): Promise<{ color: string; opacidad: number }> {
  await boton.hover();
  await asentar(boton.page());
  return boton.evaluate((nodo) => {
    for (const hijo of Array.from(nodo.children)) {
      const antes = getComputedStyle(hijo, '::before');
      if (antes.content === 'none' || antes.backgroundColor === 'rgba(0, 0, 0, 0)') continue;
      return { color: antes.backgroundColor, opacidad: Number(antes.opacity) };
    }
    throw new Error('El botón no tiene capa de estado');
  });
}

/** Da a un color la opacidad indicada, para componerlo sobre su fondo. */
export function conOpacidad(color: string, opacidad: number): string {
  const { r, g, b, a } = aRgba(color);
  return `rgba(${r}, ${g}, ${b}, ${a * opacidad})`;
}

export interface MedidaCasilla {
  marca: string;
  relleno: string;
  borde: string;
  tarjeta: string;
}

/**
 * Colores de una casilla de Material, localizada por su rol y su nombre (el `input`). El recuadro es el hermano
 * siguiente del `input` que contiene el `svg` de la marca, y la marca es su `path`; la tarjeta es el fondo
 * efectivo del contenedor de `mat-checkbox`.
 */
export async function medirCasilla(casilla: Locator): Promise<MedidaCasilla> {
  await casilla.scrollIntoViewIfNeeded();
  await asentar(casilla.page());
  const medida = await casilla.evaluate((input) => {
    let recuadro = input.nextElementSibling;
    while (recuadro && !recuadro.querySelector('svg')) recuadro = recuadro.nextElementSibling;
    if (!recuadro) throw new Error('La casilla no tiene recuadro con marca');
    const trazo = recuadro.querySelector('svg path')!;
    const capas: string[] = [];
    for (let nodo = input.closest('mat-checkbox')?.parentElement ?? null; nodo; nodo = nodo.parentElement) {
      capas.push(getComputedStyle(nodo).backgroundColor);
    }
    const estilo = getComputedStyle(recuadro);
    return {
      marca: getComputedStyle(trazo).stroke,
      relleno: estilo.backgroundColor,
      borde: estilo.borderTopColor,
      capas,
    };
  });
  return {
    marca: medida.marca,
    relleno: medida.relleno,
    borde: medida.borde,
    tarjeta: fondoEfectivo(medida.capas),
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
