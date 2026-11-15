import { expect, request as nuevoRequest, test, type Locator, type Page } from '@playwright/test';

import { actualizarProducto, leerProductos, leerSnapshot } from './apoyo/catalogo';
import { cuentasAdmin, ingresarAlAdmin, menuAdmin, desplegarGrupo, urls } from './apoyo/entorno';

/**
 * Lote 07, Admin: permisos, listados y accesibilidad (ADR-0017). Recorridos contra el BFF de prueba real:
 * - PBI-0140: sin «Actualizar» en la cabecera; el Resumen tiene el suyo y cada página consulta sus datos al entrar.
 * - PBI-0139: Inventario, Clientes, Usuarios, Banners y Reclamaciones con el panel de filtros de la feature 008.
 * - PBI-0059: Clientes e Inventario no desbordan a 375 px.
 * - PBI-0132: tablas con encabezados, «Editar»/«Eliminar» con su fila, mensajes de error y foco de los archivos.
 * - PBI-0148: una categoría con la dirección de otra no se envía.
 * - PBI-0149: fechas de Reclamaciones en la hora de Lima con el navegador en otra zona.
 * - PBI-0151: lo escrito vuelve tras ingresar de nuevo, solo para la misma persona, sin guardarse en el navegador.
 * - PBI-0153: Contenido avisa, sin bloquear, si un texto de la navegación superior no lleva a ninguna página.
 * Las pruebas que cambian datos los dejan como estaban en un `finally`: las suites van en serie.
 */

function contarGuardados(page: Page): () => number {
  let guardados = 0;
  page.on('request', (peticion) => {
    if (peticion.method() === 'PUT' && peticion.url().endsWith('/bff/admin/snapshot')) guardados += 1;
  });
  return () => guardados;
}

const consultaDelSnapshot = (page: Page) =>
  page.waitForRequest(
    (peticion) => peticion.method() === 'GET' && new URL(peticion.url()).pathname === '/bff/admin/snapshot',
  );

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

async function crearReclamo(asunto: string): Promise<string> {
  const api = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    const respuesta = await api.post('/bff/complaints', {
      data: {
        name: 'Persona lote 07',
        document: '44445555',
        email: 'reclamo-lote07@example.com',
        phone: '999000111',
        address: 'Av. Lote 07',
        subject: asunto,
        type: 'reclamo',
        detail: 'Detalle de prueba.',
        request: 'Revisión.',
      },
    });
    expect(respuesta.ok()).toBe(true);
    return (await respuesta.json()).id as string;
  } finally {
    await api.dispose();
  }
}

test.describe('PBI-0140: datos al entrar y «Actualizar» del Resumen', () => {
  test('el Resumen vuelve a consultar sus datos y cada página consulta los suyos al entrar', async ({
    page,
  }) => {
    const antes = (await leerProductos()).find((producto) => producto.id === 'p-004')!;
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await expect(page.getByRole('banner').getByRole('button', { name: 'Actualizar' })).toHaveCount(0);
      const alertas = page
        .getByRole('main')
        .locator('section', { has: page.getByRole('heading', { name: 'Alertas de inventario' }) });
      await expect(alertas).not.toContainText(antes.name);

      // Otra sesión deja el producto con stock bajo; «Actualizar» del Resumen lo trae.
      await actualizarProducto('p-004', { stock: 2 });
      const consulta = consultaDelSnapshot(page);
      await page.getByRole('main').getByRole('button', { name: 'Actualizar', exact: true }).click();
      await consulta;
      await expect(alertas).toContainText(antes.name);

      // Al entrar a Productos, la página trae los datos actuales sin recargar.
      await actualizarProducto('p-004', { name: 'Soundbar Cinema 500 lote 07' });
      await desplegarGrupo(page, 'Catálogo');
      await menuAdmin(page).getByRole('link', { name: 'Productos', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Lista de productos' })).toContainText(
        'Soundbar Cinema 500 lote 07',
      );
    } finally {
      await actualizarProducto('p-004', { name: antes.name, stock: antes.stock });
    }
  });

  test('si la consulta del Resumen falla, las cifras se quedan y el motivo sale junto al botón', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.route('**/bff/admin/snapshot', (ruta) =>
      ruta.request().method() === 'GET' ? ruta.abort('failed') : ruta.fallback(),
    );
    await page.getByRole('main').getByRole('button', { name: 'Actualizar', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'No pudimos actualizar el Resumen. Las cifras son las de la última consulta; inténtalo de nuevo.',
    );
    await expect(page.getByRole('main').getByRole('heading', { level: 2, name: 'Stock bajo' })).toBeVisible();
  });
});

interface Listado {
  ruta: string;
  titulo: string;
  panel: string;
  lista: string;
  buscar: string;
  texto: string;
  esperado: string;
  otro: string;
}

const LISTADOS: readonly Listado[] = [
  {
    ruta: '/inventario',
    titulo: 'Inventario',
    panel: 'Filtros de inventario',
    lista: 'Lista de inventario',
    buscar: 'Buscar producto',
    texto: 'mw-ec',
    esperado: 'Microondas EasyCook 30 L',
    otro: 'Soundbar Cinema 500',
  },
  {
    ruta: '/clientes',
    titulo: 'Clientes',
    panel: 'Filtros de clientes',
    lista: 'Lista de clientes',
    buscar: 'Buscar cliente',
    texto: 'CLIENTE@example',
    esperado: 'Cliente Demo',
    otro: 'Ningún cliente',
  },
  {
    ruta: '/usuarios',
    titulo: 'Usuarios y roles',
    panel: 'Filtros de usuarios',
    lista: 'Usuarios administrativos',
    buscar: 'Buscar usuario',
    texto: 'catalogo@',
    esperado: 'Vendedor Demo',
    otro: 'Administración Demo',
  },
  {
    ruta: '/banners',
    titulo: 'Banners y campañas',
    panel: 'Filtros de banners',
    lista: 'Lista de banners',
    buscar: 'Buscar banner',
    texto: 'ropa',
    esperado: 'Tu ropa, lista sin complicaciones.',
    otro: 'El cine, en tu sala.',
  },
];

test.describe('PBI-0139: filtros de los demás listados', () => {
  for (const listado of LISTADOS) {
    test(`${listado.titulo}: el panel va entre el título y la lista, filtra con «Buscar» y se limpia`, async ({
      page,
    }) => {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto(listado.ruta);
      const titulo = page.getByRole('heading', { level: 1, name: listado.titulo });
      const panel = page.getByRole('search', { name: listado.panel });
      const lista = page.getByRole('region', { name: listado.lista });
      await expect(panel).toBeVisible();
      const [cajaTitulo, cajaPanel, cajaLista] = await Promise.all(
        [titulo, panel, lista].map(async (zona: Locator) => (await zona.boundingBox())!),
      );
      expect(cajaPanel.y).toBeGreaterThan(cajaTitulo.y);
      expect(cajaLista.y).toBeGreaterThan(cajaPanel.y + cajaPanel.height - 1);

      await panel.getByRole('textbox', { name: listado.buscar }).fill(listado.texto);
      await panel.getByRole('button', { name: 'Buscar', exact: true }).click();
      await expect.poll(() => new URL(page.url()).searchParams.get('texto')).toBe(listado.texto);
      await expect(lista).toContainText(listado.esperado);
      if (!listado.otro.startsWith('Ningún')) await expect(lista).not.toContainText(listado.otro);

      await panel.getByRole('button', { name: 'Limpiar filtros' }).click();
      await expect(panel.getByRole('textbox', { name: listado.buscar })).toHaveValue('');
      // Atrás vuelve a la lista completa y el borrador se iguala a la URL.
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`${listado.ruta}$`));
      await expect(panel.getByRole('textbox', { name: listado.buscar })).toHaveValue('');
    });
  }

  test('los filtros de estado y de rol dejan solo lo que cumplen', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/inventario?estado=sin-stock');
    const inventario = page.getByRole('table', { name: 'Inventario' });
    await expect(inventario.getByRole('row')).toHaveCount(2);
    await expect(inventario).toContainText('Microondas EasyCook 30 L');

    await page.goto('/usuarios?rol=vendedor');
    await expect(page.getByRole('combobox', { name: 'Filtrar por rol' })).toContainText('Vendedor');
    await expect(page.getByRole('region', { name: 'Usuarios administrativos' })).not.toContainText(
      'Administración Demo',
    );
    await page.goto('/usuarios?estado=inactivos');
    await expect(page.getByRole('region', { name: 'Usuarios administrativos' })).toContainText(
      'Ningún usuario cumple los filtros.',
    );
  });

  test('Reclamaciones filtra por texto y por estado', async ({ page }) => {
    const asunto = `Reclamo filtros ${Date.now()}`;
    const codigo = await crearReclamo(asunto);
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/reclamaciones');
    const panel = page.getByRole('search', { name: 'Filtros de reclamaciones' });
    const lista = page.getByRole('region', { name: 'Lista de reclamaciones' });
    await panel.getByRole('textbox', { name: 'Buscar reclamación' }).fill(codigo);
    await panel.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(lista.getByRole('button')).toHaveCount(1);
    await expect(lista).toContainText(asunto);
    await page.goto(`/reclamaciones?texto=${codigo}&estado=resolved`);
    await expect(lista).toContainText('Ninguna reclamación cumple los filtros.');
  });
});

test.describe('PBI-0059 y PBI-0132: tablas a 375 px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const { ruta, tabla, encabezados } of [
    { ruta: '/inventario', tabla: 'Inventario', encabezados: ['Producto', 'Stock', 'Estado'] },
    { ruta: '/clientes', tabla: 'Clientes', encabezados: ['Cliente', 'Pedidos', 'Acciones'] },
  ]) {
    test(`${ruta} no desborda y es una tabla con encabezados`, async ({ page }) => {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto(ruta);
      const tablaLista = page.getByRole('table', { name: tabla });
      await expect(tablaLista.getByRole('row').nth(1)).toBeVisible();
      const desborde = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(desborde).toBe(0);
      const caja = (await tablaLista.boundingBox())!;
      for (const celda of await tablaLista.getByRole('cell').all()) {
        const c = (await celda.boundingBox())!;
        expect(c.x).toBeGreaterThanOrEqual(caja.x - 0.5);
        expect(c.x + c.width).toBeLessThanOrEqual(caja.x + caja.width + 0.5);
        expect(c.width).toBeGreaterThan(40);
      }
      // En Inventario la fila de encabezados se oculta en el celular; en Clientes es solo para lectores de pantalla.
      for (const nombre of encabezados)
        await expect(tablaLista.getByRole('columnheader', { name: nombre, includeHidden: true })).toHaveCount(
          1,
        );
    });
  }
});

test.describe('PBI-0132: accesibilidad de formularios y listas', () => {
  test('Productos es una tabla y cada acción dice de qué fila es', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/productos');
    const tabla = page.getByRole('table', { name: 'Productos' });
    await expect(tabla.getByRole('columnheader')).toHaveText(['Producto', 'Precio', 'Stock', 'Acciones']);
    await expect(tabla.getByRole('link', { name: 'Editar producto OLED Vision 55” 4K' })).toBeVisible();
    await expect(tabla.getByRole('button', { name: 'Eliminar producto OLED Vision 55” 4K' })).toBeVisible();
    await page.goto('/categorias');
    await expect(page.getByRole('link', { name: 'Editar categoría TV y audio' })).toBeVisible();
    await page.goto('/marcas');
    await expect(page.getByRole('button', { name: 'Eliminar marca Nova' })).toBeVisible();
    await page.goto('/banners');
    await expect(page.getByRole('button', { name: 'Editar banner El cine, en tu sala.' })).toBeVisible();
  });

  test('un formulario enviado vacío dice qué falta en cada campo, sin enviarlo', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const guardados = contarGuardados(page);
    await page.goto('/clientes');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    for (const campo of ['Nombre', 'Correo', 'Documento']) {
      const control = page.getByRole('textbox', { name: campo, exact: true });
      await expect(control).toHaveAccessibleDescription('Completa este campo.');
    }
    await page.getByRole('textbox', { name: 'Correo', exact: true }).fill('no-es-correo');
    await expect(page.getByRole('textbox', { name: 'Correo', exact: true })).toHaveAccessibleDescription(
      'Escribe un correo válido, como nombre@dominio.pe.',
    );

    await page.goto('/usuarios');
    await page.getByRole('button', { name: 'Guardar usuario' }).click();
    await expect(page.getByLabel('Contraseña temporal')).toHaveAccessibleDescription('Completa este campo.');
    await page.goto('/productos/nuevo');
    await page.getByRole('button', { name: 'Guardar producto' }).click();
    await expect(page.getByRole('combobox', { name: 'Categoría' })).toHaveAccessibleDescription(
      'Completa este campo.',
    );
    expect(guardados()).toBe(0);
  });

  test('«Cargar logo» y «Cargar foto» muestran el foco del teclado', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    for (const [ruta, nombre, anterior] of [
      ['/contenido', 'Cargar logo', null],
      ['/productos/p-001', 'Cargar foto', 'Agregar'],
    ] as const) {
      await page.goto(ruta);
      if (anterior) await page.getByRole('button', { name: anterior, exact: true }).focus();
      else await page.getByRole('heading', { level: 1 }).click();
      await page.keyboard.press('Tab');
      const etiqueta = page.locator('label', { hasText: nombre });
      await expect(etiqueta.locator('input[type="file"]')).toBeFocused();
      expect(await etiqueta.evaluate((nodo) => getComputedStyle(nodo).outlineStyle)).toBe('solid');
    }
  });
});

test('PBI-0148: una categoría con la dirección de otra no se envía y se dice cuál', async ({ page }) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  const guardados = contarGuardados(page);
  await page.goto('/categorias/nueva');
  const nombre = page.getByRole('textbox', { name: 'Nombre' });
  await nombre.fill('tv Y Áudio');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(nombre).toHaveAccessibleDescription(
    'Ya hay una categoría con la dirección tv-y-audio: «TV y audio». Cambia el nombre.',
  );
  expect(guardados()).toBe(0);
});

test.describe('PBI-0149: Reclamaciones con el navegador en otra zona', () => {
  test.use({ timezoneId: 'Asia/Tokyo' });

  test('el plazo de respuesta se ve con el día de Lima', async ({ page }) => {
    const codigo = await crearReclamo('Reclamo de zona horaria');
    const { dueAt } = (await leerSnapshot()).complaints.find((item) => item.id === codigo)!;
    // El plazo vence al final del día de Lima: en Tokio ya es el día siguiente.
    const dia = (zona: string) =>
      new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: zona }).format(new Date(dueAt));
    expect(dia('America/Lima')).not.toBe(dia('Asia/Tokyo'));

    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto(`/reclamaciones?texto=${codigo}`);
    await page.getByRole('region', { name: 'Lista de reclamaciones' }).getByRole('button').first().click();
    const plazo = page
      .locator('dt', { hasText: 'Plazo interno de atención' })
      .locator('xpath=following-sibling::dd');
    await expect(plazo).toHaveText(new RegExp(`\\b${dia('America/Lima')}\\b`));
    await expect(plazo).not.toHaveText(new RegExp(`\\b${dia('Asia/Tokyo')}\\b`));
  });
});

test('PBI-0153: Contenido avisa si un texto de la navegación superior no lleva a ninguna página', async ({
  page,
}) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await page.goto('/contenido');
  const navegacion = page.getByRole('textbox', { name: 'Navegación superior' });
  await expect(navegacion).not.toHaveValue('');
  await navegacion.fill('Inicio, Productos, Despachos');
  await expect(navegacion).toHaveAccessibleDescription(
    /«Despachos» no lleva a ninguna página de la tienda y no se mostrará\./,
  );
  // Es un aviso: no impide guardar.
  await expect(page.getByRole('button', { name: 'Guardar configuración' })).toBeEnabled();
  await navegacion.fill('Inicio, Productos, Envíos');
  await expect(navegacion).not.toHaveAccessibleDescription(/no lleva/);
});

test.describe('PBI-0151: lo escrito cuando la sesión vence', () => {
  test('vuelve al ingresar otra vez la misma persona, sin guardarse en el navegador', async ({ page }) => {
    const antes = (await leerSnapshot()).config;
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/contenido');
    const nombre = page.getByRole('textbox', { name: 'Nombre de tienda' });
    await expect(nombre).not.toHaveValue('');
    await nombre.fill('Tienda borrador lote 07');
    await vencerSesion(page);
    await page.getByRole('button', { name: 'Guardar configuración' }).click();
    await expect(page).toHaveURL(/\/login$/);

    const enElNavegador = await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }).includes('Tienda borrador lote 07'),
    );
    expect(enElNavegador).toBe(false);

    await page.getByRole('textbox', { name: 'Correo' }).fill(cuentasAdmin.superadmin.email);
    await page.getByRole('textbox', { name: 'Contraseña' }).fill(cuentasAdmin.superadmin.password);
    await page.getByRole('button', { name: 'Ingresar al panel' }).click();
    await expect(page).toHaveURL(/\/contenido$/);
    await expect(page.getByRole('status').filter({ hasText: 'Recuperamos lo que escribiste' })).toBeVisible();
    await expect(nombre).toHaveValue('Tienda borrador lote 07');
    expect((await leerSnapshot()).config).toEqual(antes);
  });

  test('otra persona que ingresa en la misma pestaña no lo recupera', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/marcas/nueva');
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Marca borrador lote 07');
    await vencerSesion(page);
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByRole('textbox', { name: 'Correo' }).fill(cuentasAdmin.admin.email);
    await page.getByRole('textbox', { name: 'Contraseña' }).fill(cuentasAdmin.admin.password);
    await page.getByRole('button', { name: 'Ingresar al panel' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible();
    await page.goto('/marcas/nueva');
    await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveValue('');
    await expect(page.getByText('Recuperamos lo que escribiste')).toHaveCount(0);
  });
});
