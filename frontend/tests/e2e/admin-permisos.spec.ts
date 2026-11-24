import { expect, request as nuevoRequest, test, type Page } from '@playwright/test';

import { enviarCambios, leerSnapshot } from './apoyo/catalogo';
import { correoUnico, cuentasAdmin, ingresarAlAdmin, urls } from './apoyo/entorno';

/**
 * Permisos de los roles en el Admin (lote 07, ADR-0017, PBI-0013; confirmados por Daniel el 2026-11-18). El menú y
 * las rutas por rol están en `admin-acceso`, `admin-menu-lateral` y `admin-resumen` (el Dashboard); el vendedor que crea y modifica
 * productos, en `admin-catalogo-filtros` (TEST-17). Aquí, Usuarios con el administrador y con el superadministrador,
 * y que el BFF rechaza lo que el Admin oculta.
 */

const listaDeUsuarios = (page: Page) => page.getByRole('region', { name: 'Usuarios administrativos' });
const tarjetasDeRoles = (page: Page) => page.getByRole('region', { name: 'Roles disponibles' });

test('el administrador ve y gestiona solo a los vendedores, sin eliminarlos', async ({ page }) => {
  const antes = (await leerSnapshot()).users;
  const correo = correoUnico('vendedor-lote07');
  try {
    await ingresarAlAdmin(page, cuentasAdmin.admin);
    await page.goto('/usuarios');
    await expect(page.getByRole('heading', { level: 1, name: 'Usuarios y roles' })).toBeVisible();

    await expect(tarjetasDeRoles(page).getByRole('heading', { level: 2 })).toHaveText(['Vendedor']);
    await expect(listaDeUsuarios(page)).toContainText('Vendedor Demo');
    await expect(listaDeUsuarios(page)).not.toContainText('Superadministrador Demo');
    await expect(listaDeUsuarios(page)).not.toContainText('Administración Demo');
    await expect(listaDeUsuarios(page).getByRole('button', { name: /Eliminar/ })).toHaveCount(0);

    // Lote 21 (PBI-0211): el usuario se registra en su propia interfaz. El rol solo puede ser «Vendedor».
    await page.getByRole('link', { name: 'Agregar usuario' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Nuevo usuario' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Rol', exact: true }).click();
    await expect(page.getByRole('option')).toHaveText(['Vendedor']);
    await page.keyboard.press('Escape');

    await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Vendedora del lote 07');
    await page.getByRole('textbox', { name: 'Correo', exact: true }).fill(correo);
    await page.getByLabel('Contraseña temporal').fill('Temporal1234');
    await page.getByRole('button', { name: 'Guardar usuario' }).click();
    await expect(listaDeUsuarios(page)).toContainText('Vendedora del lote 07');

    // Desactivarla queda guardado en el BFF.
    await listaDeUsuarios(page).getByRole('link', { name: 'Editar usuario Vendedora del lote 07' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Editar usuario' })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Activo' }).uncheck();
    await page.getByRole('button', { name: 'Guardar usuario' }).click();
    await expect(listaDeUsuarios(page)).toContainText('Vendedor · inactivo');
    const creada = (await leerSnapshot()).users.find((user) => user.email === correo);
    expect(creada).toMatchObject({ role: 'vendedor', active: false });
  } finally {
    const nuevos = (await leerSnapshot()).users.filter((user) => !antes.some((otro) => otro.id === user.id));
    if (nuevos.length) await enviarCambios({ users: { remove: nuevos.map((user) => user.id) } });
  }
});

test('el superadministrador ve los tres roles y puede eliminar usuarios', async ({ page }) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await page.goto('/usuarios');
  await expect(tarjetasDeRoles(page).getByRole('heading', { level: 2 })).toHaveText([
    'Superadministrador',
    'Administrador',
    'Vendedor',
  ]);
  await expect(
    listaDeUsuarios(page).getByRole('button', { name: 'Eliminar usuario Vendedor Demo' }),
  ).toBeVisible();
  await page.goto('/usuarios/nuevo');
  await page.getByRole('combobox', { name: 'Rol', exact: true }).click();
  await expect(page.getByRole('option')).toHaveText(['Superadministrador', 'Administrador', 'Vendedor']);
});

test('el BFF rechaza lo que el Admin oculta a cada rol', async () => {
  const api = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    const token = async (cuenta: { email: string; password: string }) =>
      (await (await api.post('/bff/admin/sessions', { data: cuenta })).json()).token as string;
    const guardar = async (cuenta: { email: string; password: string }, cambios: Record<string, unknown>) => {
      const headers = { authorization: `Bearer ${await token(cuenta)}` };
      const { revision } = await (await api.get('/bff/admin/snapshot', { headers })).json();
      const respuesta = await api.put('/bff/admin/snapshot', { headers, data: { revision, ...cambios } });
      return { status: respuesta.status(), code: (await respuesta.json()).error?.code };
    };
    expect(await guardar(cuentasAdmin.admin, { config: { storeName: 'Otra' } })).toEqual({
      status: 403,
      code: 'INSUFFICIENT_ROLE',
    });
    expect(await guardar(cuentasAdmin.admin, { users: { upsert: [{ id: 'u-3', active: false }] } })).toEqual({
      status: 403,
      code: 'USER_SCOPE_VIOLATION',
    });
    expect(await guardar(cuentasAdmin.vendedor, { products: { remove: ['p-001'] } })).toEqual({
      status: 403,
      code: 'CATALOG_SCOPE_VIOLATION',
    });
    expect(
      await guardar(cuentasAdmin.vendedor, { orders: { upsert: [{ id: 'WS-0', status: 'processing' }] } }),
    ).toEqual({ status: 403, code: 'INSUFFICIENT_ROLE' });
  } finally {
    await api.dispose();
  }
});
