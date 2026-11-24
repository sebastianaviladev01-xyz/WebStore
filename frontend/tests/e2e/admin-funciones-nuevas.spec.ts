import { expect, request as nuevoRequest, test, type Page } from '@playwright/test';

import { actualizarProducto, enviarCambios, leerProductos, leerSnapshot } from './apoyo/catalogo';
import {
  correoUnico,
  cuentasAdmin,
  fechaDeEntrega,
  ingresarAlAdmin,
  menuAdmin,
  terminosAceptados,
  urls,
} from './apoyo/entorno';

/**
 * Lote 07b, Admin: funciones nuevas y lo que dejó el lote 07 (ADR-0017). Recorridos contra el BFF de prueba real:
 * - PBI-0155: Pedidos y Tarifas de envío con el panel de filtros estándar de la feature 008.
 * - PBI-0157: lo escrito en Tarifas de envío vuelve tras vencer la sesión, con su modo.
 * - PBI-0028: «Actividad reciente» en el Dashboard completo (lote 13, PBI-0172: sin «Personas en línea»).
 * - PBI-0033: la campana de pedidos nuevos; desde el lote 13 (PBI-0173), también reclamos y errores de compra.
 * - PBI-0034: el perfil propio editable (datos y contraseña).
 * - PBI-0044: el menú lateral reducido a íconos y el panel lateral del celular.
 * - PBI-0052: la imagen pequeña de la categoría.
 * Las pruebas que cambian datos los dejan como estaban en un `finally`: las suites van en serie.
 */

/** Cierra la sesión del navegador en el BFF, como si hubiera vencido, sin que la página se entere. */
async function vencerSesion(page: Page): Promise<void> {
  const token = await page.evaluate(() => sessionStorage.getItem('webstore-admin-session-v1'));
  const api = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    const respuesta = await api.delete('/bff/admin/sessions/current', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(respuesta.status()).toBe(204);
  } finally {
    await api.dispose();
  }
}

async function ingresarDeNuevo(page: Page, cuenta: { email: string; password: string }): Promise<void> {
  await page.getByRole('textbox', { name: 'Correo' }).fill(cuenta.email);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(cuenta.password);
  await page.getByRole('button', { name: 'Ingresar al panel' }).click();
}

test.describe('PBI-0155: Pedidos y Tarifas de envío con el panel estándar', () => {
  test('Tarifas: el panel va entre el título y la lista, filtra con «Buscar», en la URL, y se limpia', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/envios');
    const titulo = page.getByRole('heading', { level: 1, name: 'Tarifas de envío' });
    const panel = page.getByRole('search', { name: 'Filtros de tarifas' });
    const lista = page.getByRole('region', { name: 'Tarifas registradas' });
    const [cajaTitulo, cajaPanel, cajaLista] = await Promise.all(
      [titulo, panel, lista].map(async (zona) => (await zona.boundingBox())!),
    );
    expect(cajaPanel.y).toBeGreaterThan(cajaTitulo.y);
    expect(cajaLista.y).toBeGreaterThan(cajaPanel.y + cajaPanel.height - 1);

    // Escribir no filtra: filtra «Buscar».
    await panel.getByRole('textbox', { name: 'Buscar tarifa' }).fill('jesus maria');
    await expect(lista).toContainText('Surco');
    await panel.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('texto')).toBe('jesus maria');
    await expect(lista).toContainText('Jesús María');
    await expect(lista).not.toContainText('Surco');

    await page.reload();
    await expect(panel.getByRole('textbox', { name: 'Buscar tarifa' })).toHaveValue('jesus maria');
    await expect(lista).not.toContainText('Surco');

    await panel.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(panel.getByRole('textbox', { name: 'Buscar tarifa' })).toHaveValue('');
    await panel.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page).toHaveURL(/\/envios$/);
    await expect(lista).toContainText('Surco');
  });

  test('Pedidos: el estado se elige en el panel y se aplica con «Buscar»', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/pedidos');
    const panel = page.getByRole('search', { name: 'Filtros de pedidos' });
    await panel.getByRole('combobox', { name: 'Filtrar por estado' }).click();
    await page.getByRole('option', { name: 'Entregado' }).click();
    await panel.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('estado')).toBe('delivered');
    await expect(page.getByRole('region', { name: 'Lista de pedidos' })).toContainText(
      // Sin pedidos entregados, el aviso de los filtros; si no hay ninguno, el de la lista vacía.
      /Ningún pedido cumple los filtros\.|Todavía no hay pedidos\.|Entregado/,
    );
    await page.goto('/pedidos?estado=desconocido');
    await expect(panel.getByRole('combobox', { name: 'Filtrar por estado' })).toContainText('Todos');
  });
});

test.describe('PBI-0157: lo escrito en Tarifas de envío cuando la sesión vence', () => {
  test('vuelve el precio para varios distritos y el ajuste porcentual, sin guardarse', async ({ page }) => {
    const antes = ((await leerSnapshot()) as unknown as { rates: unknown }).rates;
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/envios');
    await page.getByRole('combobox', { name: 'Tienda de origen' }).fill('Lima Norte');
    await page.getByRole('textbox', { name: 'Distritos' }).fill('Comas, Independencia');
    await page.getByRole('spinbutton', { name: 'Porcentaje' }).fill('7');
    await vencerSesion(page);
    await page.getByRole('button', { name: 'Guardar 2 tarifas' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await ingresarDeNuevo(page, cuentasAdmin.superadmin);
    await expect(page).toHaveURL(/\/envios$/);
    await expect(page.getByRole('status').filter({ hasText: 'Recuperamos lo que escribiste' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Tienda de origen' })).toHaveValue('Lima Norte');
    await expect(page.getByRole('textbox', { name: 'Distritos' })).toHaveValue('Comas, Independencia');
    await expect(page.getByRole('spinbutton', { name: 'Porcentaje' })).toHaveValue('7');
    expect(((await leerSnapshot()) as unknown as { rates: unknown }).rates).toEqual(antes);
  });

  test('vuelve a la edición de una tarifa, con lo que se había cambiado', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/envios');
    await page.getByRole('button', { name: 'Editar tarifa de Lima Centro a Lince' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Editar tarifa' })).toBeVisible();
    await page.getByRole('spinbutton', { name: 'Precio (S/)' }).fill('13');
    await vencerSesion(page);
    await page.getByRole('button', { name: 'Guardar tarifa' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await ingresarDeNuevo(page, cuentasAdmin.superadmin);
    await expect(page).toHaveURL(/\/envios$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Editar tarifa' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Distrito', exact: true })).toHaveValue('Lince');
    await expect(page.getByRole('spinbutton', { name: 'Precio (S/)' })).toHaveValue('13');
  });
});

/** Crea un pedido por la API pública, como la tienda; devuelve su código. */
async function crearPedido(nombre: string): Promise<string> {
  const api = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    const respuesta = await api.post('/bff/checkout/orders', {
      data: {
        customer: {
          fullName: nombre,
          email: correoUnico('lote07b'),
          phone: '987654321',
          document: '45678912',
        },
        shipping: {
          addressLine: 'Av. Lote 07b 1',
          district: 'Miraflores',
          province: 'Lima',
          department: 'Lima',
        },
        items: [{ productId: 'p-004', quantity: 1 }],
        paymentMethod: 'yape-plin',
        deliveryDate: fechaDeEntrega(),
        ...(await terminosAceptados(api)),
      },
    });
    expect(respuesta.status()).toBe(201);
    return ((await respuesta.json()) as { id: string }).id;
  } finally {
    await api.dispose();
  }
}

/** Registra un reclamo por la API pública, como el libro de reclamaciones; devuelve su código. */
async function crearReclamo(): Promise<string> {
  const api = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    const respuesta = await api.post('/bff/complaints', {
      data: {
        name: 'Reclamo Lote 13',
        document: '45678912',
        email: correoUnico('lote13'),
        phone: '987654321',
        address: 'Av. Lote 13 1',
        subject: 'Campana',
        type: 'reclamo',
        detail: 'Detalle del reclamo.',
        request: 'Respuesta.',
      },
    });
    expect(respuesta.status()).toBe(201);
    return ((await respuesta.json()) as { id: string }).id;
  } finally {
    await api.dispose();
  }
}

/** Un checkout con un total que no es el vigente: el BFF lo rechaza y lo anota como error de compra. */
async function intentarCompraConTotalViejo(): Promise<void> {
  const api = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    const respuesta = await api.post('/bff/checkout/orders', {
      data: {
        customer: {
          fullName: 'Error Lote 13',
          email: correoUnico('lote13'),
          phone: '987654321',
          document: '45678912',
        },
        shipping: {
          addressLine: 'Av. Lote 13 2',
          district: 'Miraflores',
          province: 'Lima',
          department: 'Lima',
        },
        items: [{ productId: 'p-004', quantity: 1 }],
        paymentMethod: 'yape-plin',
        deliveryDate: fechaDeEntrega(),
        ...(await terminosAceptados(api)),
        total: 1,
      },
    });
    expect(respuesta.status()).toBe(409);
  } finally {
    await api.dispose();
  }
}

test.describe('PBI-0028: «Actividad reciente» del Dashboard (PBI-0172: sin «Personas en línea»)', () => {
  test('el superadministrador ve el pedido nuevo en la actividad y ya no ve las personas en línea', async ({
    page,
  }) => {
    const pedido = await crearPedido('Actividad Lote 07b');
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const main = page.getByRole('main');
    const actividad = main.locator('section', {
      has: page.getByRole('heading', { level: 2, name: 'Actividad reciente' }),
    });
    await expect(actividad.getByRole('listitem').first()).toContainText(
      `Nuevo pedido ${pedido} de Actividad Lote 07b`,
    );
    expect(await actividad.getByRole('listitem').count()).toBeLessThanOrEqual(10);
    await expect(main.getByRole('heading', { name: 'Personas en línea' })).toHaveCount(0);
  });

  test('el vendedor no ve la actividad ni las personas en línea', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.vendedor);
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 3, name: 'Stock bajo' })).toBeVisible();
    await expect(main.getByRole('heading', { level: 2, name: 'Actividad reciente' })).toHaveCount(0);
    await expect(main.getByRole('heading', { level: 2, name: 'Personas en línea' })).toHaveCount(0);
  });
});

test.describe('PBI-0033: campana de pedidos nuevos', () => {
  test('cuenta los pedidos nuevos, los lista, lleva a cada uno y al abrirla quedan vistos', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.admin);
    // Lo que hubiera antes se marca como visto.
    const campana = page.getByRole('button', { name: /^Notificaciones/ });
    await campana.click();
    await page.keyboard.press('Escape');
    await expect(campana).toHaveAccessibleName('Notificaciones: no hay avisos nuevos');

    const pedido = await crearPedido('Campana Lote 07b');
    await page.goto('/productos');
    await expect(campana).toHaveAccessibleName('Notificaciones: 1 pedido nuevo');
    await campana.click();
    const menu = page.getByRole('menu', { name: 'Notificaciones' });
    await expect(
      menu.getByRole('menuitem', { name: new RegExp(`${pedido} · Campana Lote 07b`) }),
    ).toBeVisible();
    await menu.getByRole('menuitem', { name: new RegExp(pedido) }).click();
    await expect(page).toHaveURL(new RegExp(`/pedidos\\?pedido=${pedido}$`));
    await expect(page.getByRole('heading', { level: 2, name: pedido })).toBeVisible();
    await expect(campana).toHaveAccessibleName('Notificaciones: no hay avisos nuevos');

    // «Visto» es de cada persona: el superadministrador todavía lo tiene como nuevo.
    const otra = await page.context().browser()!.newContext({ baseURL: urls.admin, locale: 'es-PE' });
    const otraPagina = await otra.newPage();
    try {
      await ingresarAlAdmin(otraPagina, cuentasAdmin.superadmin);
      await expect(otraPagina.getByRole('button', { name: /^Notificaciones/ })).not.toHaveAccessibleName(
        'Notificaciones: no hay avisos nuevos',
      );
    } finally {
      await otra.close();
    }
  });

  test('se pone al día al volver a la pestaña y cada minuto, sin cambiar de página (PBI-0160)', async ({
    page,
  }) => {
    // Los tres pedidos descuentan stock de p-004, que otras specs también usan: se deja como estaba.
    const stockInicial = (await leerProductos()).find((producto) => producto.id === 'p-004')!.stock;
    try {
      await page.clock.install();
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      const campana = page.getByRole('button', { name: /^Notificaciones/ });
      await campana.click();
      await page.keyboard.press('Escape');
      await expect(campana).toHaveAccessibleName('Notificaciones: no hay avisos nuevos');

      // Al volver a la pestaña: el navegador avisa con `visibilitychange`.
      await crearPedido('Vuelta Lote 08');
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await expect(campana).toHaveAccessibleName('Notificaciones: 1 pedido nuevo');

      // Con la pestaña visible, cada minuto.
      await crearPedido('Minuto Lote 08');
      await page.clock.fastForward(61_000);
      await expect(campana).toHaveAccessibleName('Notificaciones: 2 pedidos nuevos');

      // Con la pestaña oculta no consulta: el pedido nuevo espera a que vuelva.
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      });
      await crearPedido('Oculta Lote 08');
      const consultas: string[] = [];
      page.on('request', (peticion) => {
        if (peticion.url().includes('/bff/admin/notifications')) consultas.push(peticion.url());
      });
      await page.clock.fastForward(61_000);
      await page.clock.fastForward(61_000);
      expect(consultas).toEqual([]);
      await expect(campana).toHaveAccessibleName('Notificaciones: 2 pedidos nuevos');
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await expect(campana).toHaveAccessibleName('Notificaciones: 3 pedidos nuevos');
    } finally {
      await actualizarProducto('p-004', { stock: stockInicial });
    }
  });

  test('el vendedor también tiene campana, porque ve los pedidos (PBI-0170)', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.vendedor);
    await expect(page.getByRole('button', { name: /^Notificaciones/ })).toBeVisible();
  });
});

test.describe('PBI-0173: la campana avisa de reclamos nuevos y errores de compra', () => {
  test('el administrador ve el reclamo y el error de compra, y cada aviso lleva a su página', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.admin);
    const campana = page.getByRole('button', { name: /^Notificaciones/ });
    await campana.click();
    await page.keyboard.press('Escape');
    await expect(campana).toHaveAccessibleName('Notificaciones: no hay avisos nuevos');

    await intentarCompraConTotalViejo();
    const reclamo = await crearReclamo();
    await page.goto('/productos');
    await expect(campana).toHaveAccessibleName('Notificaciones: 1 reclamo nuevo y 1 error de compra');
    await campana.click();
    const menu = page.getByRole('menu', { name: 'Notificaciones' });
    await expect(menu.getByText('Avisos nuevos', { exact: true })).toBeVisible();
    await expect(menu.getByRole('menuitem')).toHaveText([
      new RegExp(`Reclamo ${reclamo}`),
      /Compra no completada: el total cambió/,
      'Ver todos los pedidos',
    ]);
    await menu.getByRole('menuitem', { name: new RegExp(reclamo) }).click();
    await expect(page).toHaveURL(new RegExp(`/reclamaciones\\?texto=${reclamo}$`));
    await expect(page.getByRole('heading', { level: 1, name: 'Reclamaciones' })).toBeVisible();
    await expect(campana).toHaveAccessibleName('Notificaciones: no hay avisos nuevos');
  });

  test('el vendedor no recibe reclamos ni errores de compra: su menú es de pedidos nuevos', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.vendedor);
    const campana = page.getByRole('button', { name: /^Notificaciones/ });
    await campana.click();
    await page.keyboard.press('Escape');
    await intentarCompraConTotalViejo();
    await crearReclamo();
    await page.goto('/productos');
    await expect(campana).toHaveAccessibleName('Notificaciones: no hay avisos nuevos');
    await campana.click();
    const menu = page.getByRole('menu', { name: 'Notificaciones' });
    await expect(menu.getByText('Pedidos nuevos', { exact: true })).toBeVisible();
    await expect(menu.getByText('No hay pedidos nuevos.')).toBeVisible();
  });
});

test.describe('PBI-0034: perfil propio', () => {
  test('el vendedor cambia su nombre y la cabecera lo muestra; un correo de otro se rechaza junto al campo', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.vendedor);
    await page.goto('/perfil');
    const nombre = page.getByRole('textbox', { name: 'Nombre' });
    const correo = page.getByRole('textbox', { name: 'Correo' });
    await expect(nombre).toHaveValue('Vendedor Demo');
    try {
      await nombre.fill('Vendedora Lote 07b');
      await page.getByRole('button', { name: 'Guardar datos' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Guardamos tus datos.' })).toBeVisible();
      await expect(page.locator('ws-admin-menu-usuario')).toContainText('Vendedora Lote 07b');

      await correo.fill('owner@webstore.demo');
      await page.getByRole('button', { name: 'Guardar datos' }).click();
      await expect(page.getByText('Ese correo ya lo usa otro usuario del panel.')).toBeVisible();
    } finally {
      await nombre.fill('Vendedor Demo');
      await correo.fill(cuentasAdmin.vendedor.email);
      await page.getByRole('button', { name: 'Guardar datos' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Guardamos tus datos.' })).toBeVisible();
    }
  });

  test('cambiar la contraseña pide la actual y cierra las demás sesiones de la persona', async ({ page }) => {
    const api = await nuevoRequest.newContext({ baseURL: urls.bff });
    const nueva = 'Lote07bClave1';
    try {
      const otra = await api.post('/bff/admin/sessions', { data: cuentasAdmin.admin });
      const otroToken = ((await otra.json()) as { token: string }).token;
      await ingresarAlAdmin(page, cuentasAdmin.admin);
      await page.goto('/perfil');
      const actual = page.getByLabel('Contraseña actual');
      await actual.fill('NoEsLaClave1');
      await page.getByLabel('Nueva contraseña', { exact: true }).fill(nueva);
      await page.getByLabel('Repite la nueva contraseña').fill(nueva);
      await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
      await expect(page.getByText('La contraseña actual no es correcta.')).toBeVisible();

      await actual.fill(cuentasAdmin.admin.password);
      await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Cambiamos tu contraseña' })).toBeVisible();
      const vigente = await api.get('/bff/admin/sessions/current', {
        headers: { authorization: `Bearer ${otroToken}` },
      });
      expect(vigente.status()).toBe(401);
      // Esta sesión sigue: el panel responde.
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    } finally {
      // Deja la contraseña de la demo como estaba, para las demás pruebas.
      const sesion = await api.post('/bff/admin/sessions', {
        data: { email: cuentasAdmin.admin.email, password: nueva },
      });
      if (sesion.ok()) {
        const token = ((await sesion.json()) as { token: string }).token;
        await api.put('/bff/admin/profile/password', {
          headers: { authorization: `Bearer ${token}` },
          data: { currentPassword: nueva, newPassword: cuentasAdmin.admin.password },
        });
      }
      await api.dispose();
    }
  });

  test('una contraseña nueva débil o distinta al repetirla no se envía', async ({ page }) => {
    let enviados = 0;
    page.on('request', (peticion) => {
      if (peticion.method() === 'PUT' && peticion.url().endsWith('/bff/admin/profile/password'))
        enviados += 1;
    });
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/perfil');
    await page.getByLabel('Contraseña actual').fill(cuentasAdmin.superadmin.password);
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('corta');
    await page.getByLabel('Repite la nueva contraseña').fill('otra cosa');
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible();
    await expect(
      page.getByText('Usa al menos 10 caracteres e incluye una letra y un número.').first(),
    ).toBeVisible();
    expect(enviados).toBe(0);
  });
});

test.describe('PBI-0044: menú lateral', () => {
  test('en escritorio se reduce a íconos, conserva los nombres y se recuerda al navegar, no al recargar', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const reducir = page.getByRole('button', { name: 'Reducir el menú' });
    await expect(reducir).toHaveAttribute('aria-expanded', 'true');
    await reducir.click();
    const expandir = page.getByRole('button', { name: 'Expandir el menú' });
    await expect(expandir).toHaveAttribute('aria-expanded', 'false');
    // Sin títulos de grupo y con los 14 enlaces a la vista (lote 17: «Entregas y feriados»), con su nombre.
    await expect(menuAdmin(page).getByRole('button')).toHaveCount(0);
    await expect(menuAdmin(page).getByRole('link')).toHaveCount(14);
    const productos = menuAdmin(page).getByRole('link', { name: 'Productos', exact: true });
    await expect(productos).toHaveAttribute('title', 'Productos');
    const caja = (await menuAdmin(page).boundingBox())!;
    expect(caja.width).toBeLessThanOrEqual(60);

    await productos.click();
    await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
    await expect(expandir).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Reducir el menú' })).toBeVisible();
    const guardado = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    expect(guardado).not.toMatch(/reduc|menu/i);
  });

  test.describe('en el celular (375 px)', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('el menú se abre en un panel lateral, se cierra con Escape y al elegir una página', async ({
      page,
    }) => {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await expect(menuAdmin(page)).toHaveCount(0);
      const abrir = page.getByRole('button', { name: 'Abrir el menú' });
      await abrir.click();
      const panel = page.getByRole('dialog', { name: 'Menú de administración' });
      await expect(panel).toBeVisible();
      await expect(menuAdmin(page).getByRole('link')).toHaveCount(14);
      await page.keyboard.press('Escape');
      await expect(panel).toHaveCount(0);
      await expect(abrir).toBeFocused();

      await abrir.click();
      await menuAdmin(page).getByRole('link', { name: 'Pedidos', exact: true }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeVisible();
      await expect(panel).toHaveCount(0);
      const desborde = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(desborde).toBe(false);
    });
  });
});

test.describe('PBI-0052 y PBI-0176: imagen de la categoría', () => {
  // PNG de 1 × 1 px: el Admin genera la versión de 100 × 100 px (lote 11, PBI-0176) y la comprime antes de guardarla.
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  );

  test('se carga, se guarda en 100 × 100 px, la tienda la recibe y se puede quitar', async ({ page }) => {
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/categorias/cat-home');
      await page
        .getByLabel('Cargar imagen')
        .setInputFiles({ name: 'hogar.png', mimeType: 'image/png', buffer: PNG });
      const actual = page.getByRole('img', { name: 'Imagen actual de la categoría' });
      await expect(actual).toBeVisible();
      await expect(actual).toHaveJSProperty('naturalWidth', 100);
      await expect(actual).toHaveJSProperty('naturalHeight', 100);
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page).toHaveURL(/\/categorias$/);
      const publica = async () => {
        const api = await nuevoRequest.newContext({ baseURL: urls.bff });
        try {
          const lista = (await (await api.get('/bff/catalog/categories')).json()) as {
            id: string;
            imageUrl: string | null;
          }[];
          return lista.find((categoria) => categoria.id === 'cat-home')?.imageUrl;
        } finally {
          await api.dispose();
        }
      };
      expect(await publica()).toMatch(/^data:image\/(webp|jpeg);base64,/);

      await page.goto('/categorias/cat-home');
      await page.getByRole('button', { name: 'Quitar imagen' }).click();
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page).toHaveURL(/\/categorias$/);
      expect(await publica()).toBeNull();
    } finally {
      await enviarCambios({ categories: { upsert: [{ id: 'cat-home', imageUrl: null }] } });
    }
  });

  test('PBI-0162: la lista de Categorías muestra la miniatura de la imagen, solo si la categoría la tiene', async ({
    page,
  }) => {
    const IMAGEN_100 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAA5UlEQVR4nO3QQQ0AIAzAwElHOhbWFyG5U9B0DmvzOuAnZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBRdHfptnsVYXbAAAAABJRU5ErkJggg==';
    try {
      await enviarCambios({ categories: { upsert: [{ id: 'cat-home', imageUrl: IMAGEN_100 }] } });
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/categorias');
      const lista = page.getByRole('region', { name: 'Lista de categorías' });
      const fila = (nombre: string) =>
        lista.locator('div.border-b').filter({ has: page.getByText(nombre, { exact: true }) });
      await expect(fila('Electrohogar').locator('img')).toHaveAttribute('src', IMAGEN_100);
      await expect(fila('Electrohogar').locator('img')).toHaveAttribute('alt', '');
      await expect(fila('Cocina').locator('img')).toHaveCount(0);
    } finally {
      await enviarCambios({ categories: { upsert: [{ id: 'cat-home', imageUrl: null }] } });
    }
  });

  test('una foto de 1 MB o más, o que no es PNG, JPG ni WebP, no se usa y se dice por qué', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/categorias/cat-home');
    const cargar = page.getByLabel('Cargar imagen');
    await cargar.setInputFiles({
      name: 'grande.png',
      mimeType: 'image/png',
      buffer: Buffer.from('0'.repeat(1024 * 1024), 'utf8'),
    });
    await expect(page.getByRole('alert')).toHaveText('La foto pesa 1 MB o más. Usa una de menos de 1 MB.');
    await cargar.setInputFiles({
      name: 'logo.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg/>'),
    });
    await expect(page.getByRole('alert')).toHaveText('Usa una foto PNG, JPG o WebP.');
    await expect(page.getByRole('img', { name: 'Imagen actual de la categoría' })).toHaveCount(0);
  });
});
