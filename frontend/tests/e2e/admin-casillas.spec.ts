import { expect, test, type Page } from '@playwright/test';

import {
  COLORES_SOBRE_EL_ENLACE,
  MINIMO,
  TEMAS,
  activarTema,
  anotar,
  colorDelToken,
  crearTemaPropio,
  exigir,
  medirCasilla,
  relacionDeContraste,
  restablecerTemas,
} from './apoyo/contraste';
import { cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';

/**
 * Casillas del Admin con los temas (feature 005). Material pinta la marca de una casilla marcada con su
 * `on-primary` (`--ws-on-link`, ADR-0014) sobre su `primary` (`--ws-link`). TEST-10 (AC-03, AC-04, AC-07): con
 * A, B y C, la casilla marcada «Página Contacto» de `/contenido` tiene los colores de `COLORES_SOBRE_EL_ENLACE`,
 * la marca se lee sobre el relleno y el relleno sobre la tarjeta; la casilla sin marcar no cambia. TEST-11
 * (AC-05): lo mismo con un tema propio de principal claro, que se crea y se activa. Cada prueba arranca con B
 * activo, y al terminar B queda activo y sin los temas propios de la spec.
 */
const PREFIJO = `E2E-casillas-${Date.now().toString(36)}`;

/** Tema propio de AC-05: principal ámbar, que no se lee sobre los fondos, con la escala neutra de C. */
const TEMA_AC05 = {
  primary: '#F2B705',
  secondary: '#C2410C',
  background: '#F2F3F5',
  surface: '#FFFFFF',
  contrast: '#1F2328',
} as const;

/** Relación de la marca sobre el relleno con A y B en la base (TASK-01): no cambia. */
const RELACION_DE_LA_BASE = { a: 10.23, b: 6.7 } as const;

async function abrirContenido(page: Page): Promise<void> {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await page.goto('/contenido');
  await expect(page.getByRole('heading', { level: 1, name: 'Contenido y configuración' })).toBeVisible();
}

const paginaContacto = (page: Page) => page.getByRole('checkbox', { name: 'Página Contacto' });

/** Mide la casilla marcada, la anota y comprueba los dos mínimos de REQ-03. */
async function casillaMarcadaLegible(page: Page, tema: string) {
  const casilla = paginaContacto(page);
  await expect(casilla).toBeChecked();
  const medida = await medirCasilla(casilla);
  exigir(tema, 'casilla marcada, marca sobre el relleno', medida.marca, medida.relleno, MINIMO.marca);
  exigir(tema, 'casilla marcada, relleno sobre la tarjeta', medida.relleno, medida.tarjeta, MINIMO.marca);
  return medida;
}

test.describe('Casillas del Admin con los temas', () => {
  test.beforeEach(() => restablecerTemas(PREFIJO));
  test.afterAll(() => restablecerTemas(PREFIJO));

  for (const tema of TEMAS) {
    test(`TEST-10: con ${tema.toUpperCase()}, la marca de la casilla marcada se lee y la sin marcar no cambia`, async ({
      page,
    }) => {
      await activarTema(tema);
      await abrirContenido(page);

      const medida = await casillaMarcadaLegible(page, tema);
      expect(medida.marca).toBe(COLORES_SOBRE_EL_ENLACE[tema].marca);
      expect(medida.relleno).toBe(COLORES_SOBRE_EL_ENLACE[tema].relleno);
      if (tema !== 'c') {
        expect(relacionDeContraste(medida.marca, medida.relleno)).toBeCloseTo(RELACION_DE_LA_BASE[tema], 2);
      }

      // Sin marcar (sin guardar): el borde no cambia. Material lo pinta con `--mat-sys-on-surface-variant`, que
      // `tokens.css` lleva a `--ws-muted` (el plan decía `--ws-border-strong`; la base ya pinta `--ws-muted`).
      const casilla = paginaContacto(page);
      await casilla.uncheck();
      await expect(casilla).not.toBeChecked();
      // En reposo: sin el puntero encima ni el foco, que pintan el borde con `on-surface`.
      await page.mouse.move(0, 0);
      await casilla.blur();
      const sinMarcar = await medirCasilla(casilla);
      anotar(
        tema,
        'casilla sin marcar, borde sobre la tarjeta',
        sinMarcar.borde,
        sinMarcar.tarjeta,
        MINIMO.marca,
      );
      expect(sinMarcar.borde).toBe(await colorDelToken(page, '--ws-muted'));
      // Sin relleno: lo que se pinta dentro del recuadro es la tarjeta (a lo sumo un nivel de diferencia del velo de estado).
      expect(
        relacionDeContraste(sinMarcar.relleno, sinMarcar.tarjeta),
        'la casilla sin marcar no tiene relleno',
      ).toBeLessThan(1.02);
    });
  }

  test('TEST-11: con un tema propio de principal claro, la marca de la casilla marcada se lee', async ({
    page,
  }) => {
    const id = await crearTemaPropio(`${PREFIJO} AC-05`, TEMA_AC05);
    await activarTema(id);
    await abrirContenido(page);

    const medida = await casillaMarcadaLegible(page, 'AC-05');
    // El enlace pasa al contraste (el ámbar no se lee sobre la superficie) y la marca, al blanco: como con C.
    expect(medida.relleno).toBe(COLORES_SOBRE_EL_ENLACE.c.relleno);
    expect(medida.marca).toBe(await colorDelToken(page, '--ws-on-link'));
  });
});
