import { expect, request as nuevoRequest, test, type Page } from '@playwright/test';

import {
  actualizarProducto,
  agregarProductos,
  cambiarMarcas,
  leerMarcas,
  leerProductos,
  leerSnapshot,
  productoDePrueba,
  retirarProductos,
} from './apoyo/catalogo';
import { correoUnico, cuentasAdmin, fechaDeEntrega, ingresarAlAdmin, urls } from './apoyo/entorno';

/**
 * Lote 06, Admin: guardado y datos (ADR-0017). Recorridos del Admin contra el BFF de prueba real:
 * - PBI-0121: un doble clic en «Guardar» no duplica el registro.
 * - PBI-0122 y PBI-0130: Clientes muestra el modo de edición, se puede cancelar y eliminar el cliente en edición
 *   no lo deja listo para volver a crearse.
 * - PBI-0120 y PBI-0142: al reintentar tras `409`, solo se aplica el cambio de la persona; si otra persona cambió
 *   el mismo campo o eliminó el registro, no se guarda y se avisa.
 * - PBI-0119: una foto grande se reduce antes de guardarla.
 * - PBI-0123, PBI-0127, PBI-0128, PBI-0129 y PBI-0131: lo que no se puede guardar se dice junto al campo o la
 *   lista, sin enviarlo.
 * - PBI-0023, PBI-0066, PBI-0067, PBI-0126 y PBI-0145: Pedidos.
 * - PBI-0071, PBI-0124 y PBI-0125: acceso, sesión vencida y Contenido.
 * Las pruebas que cambian datos los dejan como estaban en un `finally`: las suites van en serie.
 */

/** Cuenta los `PUT` del snapshot que salen de la página: lo que se rechaza en el Admin no debe enviarse. */
function contarGuardados(page: Page): () => number {
  let guardados = 0;
  page.on('request', (peticion) => {
    if (peticion.method() === 'PUT' && peticion.url().endsWith('/bff/admin/snapshot')) guardados += 1;
  });
  return () => guardados;
}

/** Un dialogo nativo (confirm) que no debería abrirse; lo cuenta y lo descarta. */
function contarDialogos(page: Page): () => number {
  let dialogos = 0;
  page.on('dialog', (dialogo) => {
    dialogos += 1;
    void dialogo.dismiss();
  });
  return () => dialogos;
}

async function crearPedido(page: Page): Promise<string> {
  const respuesta = await page.request.post(`${urls.bff}/bff/checkout/orders`, {
    data: {
      customer: {
        fullName: 'Pedido Lote 06',
        email: correoUnico('lote06'),
        phone: '987654321',
        document: '45678912',
      },
      shipping: {
        addressLine: 'Av. Larco 456',
        district: 'Miraflores',
        province: 'Lima',
        department: 'Lima',
      },
      items: [{ productId: 'p-004', quantity: 1 }],
      paymentMethod: 'card',
      deliveryDate: fechaDeEntrega(),
      termsAccepted: true,
    },
  });
  expect(respuesta.ok()).toBe(true);
  return ((await respuesta.json()) as { id: string }).id;
}

const estadoDelPedido = async (id: string) =>
  (await leerSnapshot()).orders.find((pedido) => pedido.id === id)?.status;

test.describe('Guardado del Admin', () => {
  test('PBI-0121: un doble clic en «Guardar» crea una sola marca', async ({ page }) => {
    const nombre = 'Marca doble clic 06';
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/marcas/nueva');
      await page.getByRole('textbox', { name: 'Nombre' }).fill(nombre);
      await page.getByRole('button', { name: 'Guardar', exact: true }).dblclick();
      await expect(page).toHaveURL(/\/marcas$/);
      expect((await leerMarcas()).filter((marca) => marca.name === nombre)).toHaveLength(1);
    } finally {
      await cambiarMarcas((marcas) => marcas.filter((marca) => marca.name !== nombre));
    }
  });

  test('PBI-0120: tras un 409, el precio se guarda y el stock vendido por otra sesión se conserva', async ({
    page,
  }) => {
    const [original] = (await leerProductos()).filter((producto) => producto.id === 'p-002');
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/productos/p-002');
      const precio = page.getByRole('spinbutton', { name: 'Precio' });
      await expect(precio).toHaveValue(String(original.price));
      // Otra sesión vende o ajusta el stock mientras la ficha está abierta: la revisión cambia.
      await actualizarProducto('p-002', { stock: original.stock + 3 });
      await precio.fill(String(original.price + 10));
      await page.getByRole('button', { name: 'Guardar producto' }).click();
      await expect(page).toHaveURL(/\/productos$/);
      const guardado = (await leerProductos()).find((producto) => producto.id === 'p-002')!;
      expect(guardado.price).toBe(original.price + 10);
      expect(guardado.stock, 'conserva el stock de la otra sesión').toBe(original.stock + 3);
    } finally {
      await actualizarProducto('p-002', { price: original.price, stock: original.stock });
    }
  });

  test('PBI-0120: si otra sesión cambió el mismo precio, no lo pisa y pide revisar', async ({ page }) => {
    const [original] = (await leerProductos()).filter((producto) => producto.id === 'p-002');
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/productos/p-002');
      const precio = page.getByRole('spinbutton', { name: 'Precio' });
      await expect(precio).toHaveValue(String(original.price));
      await actualizarProducto('p-002', { price: original.price + 5 });
      await precio.fill(String(original.price + 20));
      await page.getByRole('button', { name: 'Guardar producto' }).click();
      const formulario = page.getByRole('form', { name: 'Editar producto' });
      await expect(formulario.getByRole('alert')).toContainText('otra persona cambió el precio');
      await expect(page).toHaveURL(/\/productos\/p-002$/);
      await expect(precio, 'lo escrito se conserva').toHaveValue(String(original.price + 20));
      expect((await leerProductos()).find((producto) => producto.id === 'p-002')!.price).toBe(
        original.price + 5,
      );
    } finally {
      await actualizarProducto('p-002', { price: original.price });
    }
  });

  test('PBI-0142: guardar un producto que otra sesión eliminó no lo vuelve a crear', async ({ page }) => {
    const producto = productoDePrueba({
      id: 'p-lote06-borrado',
      sku: 'LOTE06-BORRADO',
      name: 'Producto borrado 06',
    });
    await agregarProductos([producto]);
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto(`/productos/${producto.id}`);
      const nombre = page.getByRole('textbox', { name: 'Nombre', exact: true });
      await expect(nombre).toHaveValue(producto.name);
      await retirarProductos([producto.id]);
      await nombre.fill('Producto borrado 06 editado');
      await page.getByRole('button', { name: 'Guardar producto' }).click();
      await expect(page.getByRole('form', { name: 'Editar producto' }).getByRole('alert')).toContainText(
        'ya no existe',
      );
      expect((await leerProductos()).some((item) => item.id === producto.id)).toBe(false);
    } finally {
      await retirarProductos([producto.id]);
    }
  });

  test('PBI-0119: una foto grande se reduce y el producto se guarda', async ({ page }) => {
    const producto = productoDePrueba({ id: 'p-lote06-foto', sku: 'LOTE06-FOTO', name: 'Producto foto 06' });
    await agregarProductos([producto]);
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto(`/productos/${producto.id}`);
      await expect(page.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue(producto.name);
      // Una imagen de 3000 × 2000 px que pesa más de los 400 KB que antes se rechazaban.
      // La imagen se arma en la página y se pone en el campo de archivo, como si la persona la eligiera.
      const bytes = await page.getByLabel('Cargar foto').evaluate(async (campo: HTMLInputElement) => {
        const lienzo = document.createElement('canvas');
        lienzo.width = 3000;
        lienzo.height = 2000;
        const contexto = lienzo.getContext('2d')!;
        for (let i = 0; i < 400; i++) {
          contexto.fillStyle = `hsl(${(i * 37) % 360} 70% ${30 + (i % 40)}%)`;
          contexto.beginPath();
          contexto.arc((i * 211) % 3000, (i * 97) % 2000, 40 + (i % 160), 0, Math.PI * 2);
          contexto.fill();
        }
        const png = await new Promise<Blob>((listo) => lienzo.toBlob((blob) => listo(blob!), 'image/png'));
        const archivos = new DataTransfer();
        archivos.items.add(new File([png], 'grande.png', { type: 'image/png' }));
        campo.files = archivos.files;
        campo.dispatchEvent(new Event('change', { bubbles: true }));
        return png.size;
      });
      expect(bytes).toBeGreaterThan(400 * 1024);
      await expect(page.getByRole('img', { name: 'Foto 2 del producto' })).toBeVisible();
      await page.getByRole('button', { name: 'Guardar producto' }).click();
      await expect(page).toHaveURL(/\/productos$/);
      const guardado = (await leerProductos()).find((item) => item.id === producto.id)!;
      expect(guardado.gallery).toHaveLength(1);
      expect(guardado.gallery[0].length).toBeLessThanOrEqual(250 * 1024);
    } finally {
      await retirarProductos([producto.id]);
    }
  });

  test('PBI-0122 y PBI-0130: Clientes muestra el modo de edición, se cancela y no recrea al eliminado', async ({
    page,
  }) => {
    const nombre = 'Cliente Lote 06';
    const correo = correoUnico('cliente-lote06');
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/clientes');
    await expect(page.getByRole('heading', { level: 2, name: 'Nuevo cliente' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Nombre' }).fill(nombre);
    await page.getByRole('textbox', { name: 'Correo' }).fill(correo);
    await page.getByRole('textbox', { name: 'Documento' }).fill('11112222');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    const eliminar = page.getByRole('button', { name: `Eliminar cliente ${nombre}` });
    await expect(eliminar).toBeVisible();

    // Lote 07 (PBI-0132): «Editar» dice de qué cliente es.
    await page.getByRole('button', { name: `Editar cliente ${nombre}` }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Editar cliente' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Nuevo cliente' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveValue('');

    await page.getByRole('button', { name: `Editar cliente ${nombre}` }).click();
    page.once('dialog', (dialogo) => void dialogo.accept());
    await eliminar.click();
    await expect(eliminar).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: 'Nuevo cliente' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveValue('');
    const clientes = (await leerSnapshot()).customers;
    expect(clientes.some((cliente) => cliente.email === correo)).toBe(false);
  });

  test('PBI-0130: el vendedor edita un producto con el título de edición y «Cancelar»', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.vendedor);
    await page.goto('/productos/p-001');
    await expect(page.getByRole('heading', { level: 1, name: 'Editar producto' })).toBeVisible();
    await expect(
      page.getByRole('form', { name: 'Editar producto' }).getByRole('link', { name: 'Cancelar' }),
    ).toBeVisible();
  });
});

test.describe('Lo que no se guarda se dice antes de enviar', () => {
  test('PBI-0131: una marca o una categoría en uso no se elimina y se dice por qué', async ({ page }) => {
    const marcas = await leerMarcas();
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const dialogos = contarDialogos(page);
    const guardados = contarGuardados(page);

    await page.goto('/marcas');
    await page
      .getByRole('region', { name: 'Lista de marcas' })
      .getByRole('button', { name: 'Eliminar' })
      .first()
      .click();
    await expect(page.getByRole('alert')).toHaveText(
      /No se puede eliminar la marca «Nova»: la usan \d+ productos\. Cámbiales la marca antes de eliminarla\./,
    );

    await page.goto('/categorias');
    await page
      .getByRole('region', { name: 'Lista de categorías' })
      .getByRole('button', { name: 'Eliminar' })
      .first()
      .click();
    await expect(page.getByRole('alert')).toHaveText(
      'No se puede eliminar la categoría «TV y audio»: tiene 1 subcategoría. Muévela o elimínala antes.',
    );
    expect(dialogos(), 'no pide confirmar algo que no se puede hacer').toBe(0);
    expect(guardados()).toBe(0);
    expect(await leerMarcas()).toEqual(marcas);
  });

  test('PBI-0127: el stock vacío o con decimales no se guarda y el error queda en su campo', async ({
    page,
  }) => {
    const antes = (await leerProductos()).find((producto) => producto.id === 'p-001')!;
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const guardados = contarGuardados(page);
    await page.goto('/inventario');
    const stock = page.getByRole('spinbutton', { name: `Stock de ${antes.name}` });
    for (const texto of ['', '2.5']) {
      await stock.fill(texto);
      await stock.press('Tab');
      await expect(stock).toHaveAttribute('aria-invalid', 'true');
      await expect(stock).toHaveAccessibleDescription('Usa un número entero desde 0. No se guardó.');
    }
    expect(guardados()).toBe(0);
    expect((await leerProductos()).find((producto) => producto.id === 'p-001')!.stock).toBe(antes.stock);
  });

  test('PBI-0123: un usuario con el correo de otro no se envía', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const guardados = contarGuardados(page);
    await page.goto('/usuarios');
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Otra persona');
    const correo = page.getByRole('textbox', { name: 'Correo' });
    await correo.fill('ADMIN@webstore.demo');
    await page.getByLabel('Contraseña temporal').fill('Temporal1234');
    await page.getByRole('button', { name: 'Guardar usuario' }).click();
    await expect(correo).toHaveAccessibleDescription(
      'Ya hay un usuario con ese correo: Administración Demo. Usa otro.',
    );
    expect(guardados()).toBe(0);
  });

  test('PBI-0129: un SKU o una dirección de ficha de otro producto no se envía y se dice cuál', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const guardados = contarGuardados(page);
    await page.goto('/productos/nuevo');
    const nombre = page.getByRole('textbox', { name: 'Nombre', exact: true });
    const sku = page.getByRole('textbox', { name: 'SKU' });
    await nombre.fill('Televisor lote 06');
    await sku.fill('tv-oled-55-vsn');
    await page.getByRole('textbox', { name: 'Descripción' }).fill('Descripción');
    await page.getByRole('textbox', { name: 'Imagen principal' }).fill('assets/products/tv-studio.jpg');
    await page.getByRole('textbox', { name: /Características/ }).fill('Una');
    await page.getByRole('combobox', { name: 'Categoría' }).click();
    await page.getByRole('option', { name: 'TV y audio' }).click();
    await page.getByRole('combobox', { name: 'Marca' }).click();
    await page.getByRole('option', { name: 'Nova' }).click();
    const guardar = page.getByRole('button', { name: 'Guardar producto' });
    await guardar.click();
    await expect(sku).toHaveAccessibleDescription(
      'Ya hay un producto con el SKU tv-oled-55-vsn: «OLED Vision 55” 4K». Usa otro SKU.',
    );
    await sku.fill('LOTE06-NUEVO');
    await nombre.fill('Oled Visión 55 4K');
    await guardar.click();
    await expect(nombre).toHaveAccessibleDescription(
      'Ya hay un producto con la dirección de ficha oled-vision-55-4k: «OLED Vision 55” 4K». Cambia el nombre.',
    );
    expect(guardados()).toBe(0);
  });

  test('PBI-0128: un banner que termina antes de empezar no se envía', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const guardados = contarGuardados(page);
    await page.goto('/banners');
    await page.getByRole('textbox', { name: 'Antetítulo' }).fill('Campaña');
    await page.getByRole('textbox', { name: 'Título', exact: true }).fill('Banner lote 06');
    await page.getByRole('textbox', { name: 'Descripción', exact: true }).fill('Descripción');
    await page.getByRole('textbox', { name: 'Texto CTA' }).fill('Ver');
    await page.getByRole('combobox', { name: 'Ubicación' }).click();
    await page.getByRole('option', { name: 'Promoción' }).click();
    await page.getByLabel('Inicio').fill('2030-12-10');
    const fin = page.getByLabel('Fin');
    await fin.fill('2030-12-01');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(fin).toHaveAccessibleDescription('Debe ser el día del inicio o después.');
    expect(guardados()).toBe(0);
  });
});

test.describe('Pedidos', () => {
  test('PBI-0023, PBI-0126, PBI-0145 y PBI-0066: selectores, términos, cancelar sin cambiar y detalle filtrado', async ({
    page,
  }) => {
    const id = await crearPedido(page);
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto(`/pedidos?pedido=${id}`);

    // Lote 07b (PBI-0155): el filtro de estado va en el panel estándar y se aplica con «Buscar».
    const filtro = page.getByRole('combobox', { name: 'Filtrar por estado' });
    const cambiar = page.getByRole('combobox', { name: 'Cambiar estado' });
    await expect(filtro).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: id })).toBeVisible();
    await expect(page.getByText(/Aceptados el \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)).toBeVisible();

    // PBI-0126: responder «Cancelar» a la confirmación deja el selector como estaba.
    page.once('dialog', (dialogo) => void dialogo.dismiss());
    await cambiar.click();
    await page.getByRole('option', { name: 'Cancelado' }).click();
    await expect(cambiar).toHaveText('Confirmado');
    expect(await estadoDelPedido(id)).toBe('confirmed');

    // PBI-0066: con un filtro que no incluye el pedido, el detalle no lo muestra.
    await filtro.click();
    await page.getByRole('option', { name: 'Entregado' }).click();
    await page
      .getByRole('search', { name: 'Filtros de pedidos' })
      .getByRole('button', { name: 'Buscar' })
      .click();
    await expect(page.getByText('Ningún pedido cumple los filtros.')).toBeVisible();
    await expect(page.getByText('Selecciona un pedido para ver su detalle.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: id })).toHaveCount(0);
  });

  test.describe('con el navegador en otra zona horaria', () => {
    test.use({ timezoneId: 'Pacific/Kiritimati' });

    test('PBI-0067: las fechas de los pedidos se muestran en la hora de Lima', async ({ page }) => {
      const id = await crearPedido(page);
      // 23:30 del 13/11/2026 en Lima, que en Kiritimati (UTC+14) ya es el 14/11 a las 18:30.
      await page.route('**/bff/admin/snapshot', async (ruta) => {
        if (ruta.request().method() !== 'GET') return ruta.fallback();
        const respuesta = await ruta.fetch();
        const snapshot = await respuesta.json();
        for (const pedido of snapshot.orders)
          if (pedido.id === id) {
            pedido.createdAt = '2026-11-14T04:30:00.000Z';
            pedido.termsAcceptedAt = '2026-11-14T04:29:00.000Z';
          }
        await ruta.fulfill({ response: respuesta, json: snapshot });
      });
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto(`/pedidos?pedido=${id}`);
      await expect(page.getByRole('region', { name: 'Lista de pedidos' })).toContainText('13/11/2026 23:30');
      await expect(page.getByText('13 de noviembre, 23:30')).toBeVisible();
      await expect(page.getByText('Aceptados el 13/11/2026 23:29')).toBeVisible();
    });
  });
});

test.describe('Acceso, sesión y Contenido', () => {
  test('PBI-0071: las credenciales de prueba solo se muestran en modo demo', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Credenciales del entorno local')).toBeVisible();

    await page.route('**/bff/appearance', async (ruta) => {
      const respuesta = await ruta.fetch();
      await ruta.fulfill({ response: respuesta, json: { ...(await respuesta.json()), demoMode: false } });
    });
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Acceso administrativo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar al panel' })).toBeVisible();
    await expect(page.getByText('Credenciales del entorno local')).toHaveCount(0);
    await expect(page.getByText(/WebStore#2026/)).toHaveCount(0);
  });

  test('PBI-0124: si la sesión vence a mitad de una edición, el Admin lleva al acceso y lo dice', async ({
    page,
  }) => {
    const nombre = 'Marca sesión vencida 06';
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/marcas/nueva');
    await page.getByRole('textbox', { name: 'Nombre' }).fill(nombre);
    // La sesión se cierra en el BFF (como si venciera) sin que el navegador se entere.
    const token = await page.evaluate(() => sessionStorage.getItem('webstore-admin-session-v1'));
    const api = await nuevoRequest.newContext({ baseURL: urls.bff });
    try {
      expect(
        (
          await api.delete('/bff/admin/sessions/current', { headers: { authorization: `Bearer ${token}` } })
        ).status(),
      ).toBe(204);
    } finally {
      await api.dispose();
    }
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('alert')).toHaveText(
      'Tu sesión venció. Vuelve a iniciar sesión para continuar.',
    );
    expect((await leerMarcas()).some((marca) => marca.name === nombre)).toBe(false);
  });

  test('PBI-0125: si el guardado de Contenido falla, lo escrito se queda y el motivo sale junto al botón', async ({
    page,
  }) => {
    const antes = (await leerSnapshot()).config;
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/contenido');
    const nombre = page.getByRole('textbox', { name: 'Nombre de tienda' });
    await expect(nombre).not.toHaveValue('');
    await page.route('**/bff/admin/snapshot', (ruta) =>
      ruta.request().method() === 'PUT'
        ? ruta.fulfill({
            status: 413,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { code: 'PAYLOAD_TOO_LARGE', message: 'El contenido supera el límite permitido.' },
            }),
          })
        : ruta.fallback(),
    );
    await nombre.fill('Tienda en edición 06');
    const guardar = page.getByRole('button', { name: 'Guardar configuración' });
    await guardar.click();
    // El motivo sale justo encima del botón, una sola vez: la cabecera ya no lo repite (lote 07, PBI-0150).
    const error = page.getByRole('alert').filter({ hasText: 'pesa demasiado' });
    await expect(error).toHaveCount(1);
    await expect(error).toBeVisible();
    const cajaError = (await error.boundingBox())!;
    const cajaBoton = (await guardar.boundingBox())!;
    expect(cajaBoton.y - (cajaError.y + cajaError.height)).toBeGreaterThanOrEqual(0);
    expect(cajaBoton.y - (cajaError.y + cajaError.height)).toBeLessThan(40);
    await expect(nombre).toHaveValue('Tienda en edición 06');
    await page.unroute('**/bff/admin/snapshot');
    expect((await leerSnapshot()).config).toEqual(antes);
  });
});
