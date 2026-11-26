import { expect, test, type Page } from '@playwright/test';

import { leerSnapshot } from './apoyo/catalogo';
import { cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';

/**
 * Lote 40 (ADR-0032), PBI-0256 ampliado a los demás registros: al abrir la edición de una categoría, un usuario o un
 * banner en una carga nueva, el panel todavía no tiene datos. Si la consulta del snapshot falla, la página no dice
 * que el registro no existe: avisa de que no pudo traer los datos y ofrece «Reintentar». «Ya no existe» queda para
 * cuando la consulta responde sin él. El registro del producto está en `admin-registro-producto-sin-datos.spec.ts`.
 */
const registros = [
  {
    nombre: 'la categoría',
    ruta: async () => '/categorias/cat-home',
    inexistente: '/categorias/cat-no-existe-040',
    aviso: 'No pudimos traer los datos de la categoría',
    noExiste: 'Esta categoría ya no existe',
    formulario: 'Editar categoría',
  },
  {
    nombre: 'el usuario',
    ruta: async () => {
      const usuario = (await leerSnapshot()).users.find(
        (item) => item.email !== cuentasAdmin.superadmin.email,
      )!;
      return `/usuarios/${usuario.id}`;
    },
    inexistente: '/usuarios/u-no-existe-040',
    aviso: 'No pudimos traer los datos del usuario',
    noExiste: 'Este usuario ya no existe',
    formulario: 'Editar usuario',
  },
  {
    nombre: 'el banner',
    ruta: async () => `/banners/${(await leerSnapshot()).banners[0].id}`,
    inexistente: '/banners/bn-no-existe-040',
    aviso: 'No pudimos traer los datos del banner',
    noExiste: 'Este banner ya no existe',
    formulario: 'Editar banner',
  },
];

/** La consulta del snapshot responde `503` mientras `estado.fallar` sea `true`; cuenta las lecturas. */
async function snapshotCaido(page: Page) {
  const estado = { fallar: true, consultas: 0 };
  await page.route('**/bff/admin/snapshot', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    estado.consultas++;
    if (!estado.fallar) return route.fallback();
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"UNAVAILABLE"}' });
  });
  return estado;
}

test.describe('Registros sin datos del panel', () => {
  for (const registro of registros) {
    test(`PBI-0256: si la consulta falla en una carga nueva, ${registro.nombre} avisa y reintenta, sin decir que no existe`, async ({
      page,
    }) => {
      const ruta = await registro.ruta();
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      const estado = await snapshotCaido(page);
      // Carga nueva: el panel arranca sin datos y la sesión se restaura del token.
      await page.goto(ruta);

      const principal = page.getByRole('main');
      const aviso = principal.getByRole('alert').filter({ hasText: registro.aviso });
      await expect(aviso).toBeVisible();
      await expect(aviso.getByRole('button', { name: 'Reintentar' })).toBeVisible();
      await expect(principal.getByText(registro.noExiste)).toHaveCount(0);
      await expect(principal.getByRole('form', { name: registro.formulario })).toHaveCount(0);
      expect(estado.consultas).toBe(1);

      // Con el BFF de vuelta, «Reintentar» trae el registro y muestra el formulario, sin avisos.
      estado.fallar = false;
      await aviso.getByRole('button', { name: 'Reintentar' }).click();
      await expect(principal.getByRole('form', { name: registro.formulario })).toBeVisible();
      await expect(principal.getByRole('alert')).toHaveCount(0);
      expect(estado.consultas).toBe(2);
    });

    test(`PBI-0256: si la consulta responde sin ${registro.nombre}, dice que ya no existe`, async ({
      page,
    }) => {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto(registro.inexistente);
      const principal = page.getByRole('main');
      await expect(principal.getByRole('alert')).toContainText(registro.noExiste);
      await expect(principal.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
    });
  }
});
