import { expect, test, type Page, type Request } from '@playwright/test';

import { actualizarProducto, leerProductos } from './apoyo/catalogo';
import { correoUnico, fechaDeEntrega, urls } from './apoyo/entorno';
import { conservarElStock } from './apoyo/pedidos';

// Los pedidos que crea esta spec se cancelan al terminar: el stock queda como estaba (PBI-0207).
conservarElStock();

/**
 * Lote 04, tienda: carrito y checkout (ADR-0017). Cada prueba cita el elemento del backlog que cubre. Las que
 * simulan un fallo del BFF lo hacen con `page.route`; las que cambian datos (precio, cuenta) lo hacen por la API y
 * dejan el estado como estaba.
 */
const CARRITO = 'webstore-cart-v1';
const ACCESOS = 'webstore-order-access-v1';

/** Deja el carrito guardado con estas líneas antes de que cargue la tienda (solo la primera vez). */
async function conCarrito(page: Page, lineas: { productId: string; quantity: number }[]): Promise<void> {
  await page.addInitScript(
    ([clave, valor]) => {
      if (sessionStorage.getItem('e2e-carrito-iniciado')) return;
      localStorage.setItem(clave, valor);
      sessionStorage.setItem('e2e-carrito-iniciado', '1');
    },
    [CARRITO, JSON.stringify(lineas)] as const,
  );
}

const problema = (status: number, code: string, message: string, details?: object) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify({ message, error: { code, message, ...(details ? { details } : {}) } }),
});

const terminos = (page: Page) => page.getByRole('checkbox', { name: 'Acepto los términos y condiciones' });
const finalizar = (page: Page) => page.getByRole('button', { name: 'Finalizar compra' });

/** Llena el checkout como invitado con envío a Miraflores (S/ 12.00) y acepta los términos. */
async function llenarCheckout(page: Page, { aceptar = true } = {}): Promise<void> {
  await page.getByRole('textbox', { name: 'Nombres y apellidos' }).fill('Comprador Lote 04');
  await page.getByRole('textbox', { name: 'Correo' }).fill(correoUnico('lote04'));
  await page.getByRole('textbox', { name: 'Teléfono' }).fill('987654321');
  await page.getByRole('textbox', { name: 'DNI / documento' }).fill('45678912');
  await page.getByRole('combobox', { name: 'Distrito destino' }).click();
  await page.getByRole('option', { name: 'Miraflores', exact: true }).click();
  await page.getByRole('textbox', { name: 'Dirección' }).fill('Av. Larco 123');
  await expect(page.getByText(/Envío cotizado:\s*S\/\s*12\.00/)).toBeVisible();
  if (aceptar) await terminos(page).check();
}

test.describe('PBI-0040: términos y condiciones', () => {
  test('la casilla empieza sin marcar, enlaza a los términos y sin marcarla no se envía el pedido', async ({
    page,
  }) => {
    await conCarrito(page, [{ productId: 'p-004', quantity: 1 }]);
    const enviados: Request[] = [];
    page.on('request', (peticion) => {
      if (peticion.url().includes('/bff/checkout/orders')) enviados.push(peticion);
    });
    await page.goto('/checkout');
    await llenarCheckout(page, { aceptar: false });

    await expect(terminos(page)).not.toBeChecked();
    const enlace = page.getByRole('link', { name: 'Leer los términos y condiciones' });
    await expect(enlace).toHaveAttribute('href', '/info/terminos');

    await finalizar(page).click();
    const aviso = page.getByText('Acepta los términos y condiciones para finalizar la compra.');
    await expect(aviso).toBeVisible();
    // El aviso describe la casilla: el lector de pantalla lo lee con ella.
    await expect(terminos(page)).toHaveAccessibleDescription(
      'Acepta los términos y condiciones para finalizar la compra.',
    );
    expect(enviados).toHaveLength(0);

    await terminos(page).check();
    await expect(aviso).toHaveCount(0);
    await finalizar(page).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Gracias por tu compra' })).toBeVisible();
    expect(enviados).toHaveLength(1);
    // Lote 17 (PBI-0177): con la versión de los términos que muestra la tienda.
    const { termsVersion } = await (await page.request.get(`${urls.bff}/bff/content/settings`)).json();
    expect(enviados[0].postDataJSON()).toMatchObject({ termsAccepted: true, termsVersion });

    // El BFF guarda cuándo se aceptaron.
    const id = decodeURIComponent(page.url().split('/pedido/')[1]);
    const token = await page.evaluate(
      ([clave, pedido]) => JSON.parse(localStorage.getItem(clave) ?? '{}')[pedido],
      [ACCESOS, id] as const,
    );
    const guardado = await page.request.get(`${urls.bff}/bff/orders/${encodeURIComponent(id)}`, {
      headers: { 'x-order-token': token },
    });
    const pedidoGuardado = await guardado.json();
    expect(Date.parse(pedidoGuardado.termsAcceptedAt)).not.toBeNaN();
    expect(pedidoGuardado.termsVersion).toBe(termsVersion);
  });

  test('lote 17 (PBI-0177): si los términos cambiaron, avisa y pide volver a aceptarlos', async ({
    page,
  }) => {
    await conCarrito(page, [{ productId: 'p-004', quantity: 1 }]);
    const mensaje =
      'Los términos y condiciones cambiaron. Revísalos y vuelve a aceptarlos para finalizar la compra.';
    let ajustes = 0;
    page.on('request', (peticion) => {
      if (peticion.url().includes('/bff/content/settings')) ajustes++;
    });
    await page.route('**/bff/checkout/orders', (ruta) =>
      ruta.fulfill(problema(409, 'TERMS_VERSION_CHANGED', mensaje, { termsVersion: 2 })),
    );
    await page.goto('/checkout');
    await llenarCheckout(page);
    const antes = ajustes;
    await finalizar(page).click();

    await expect(page.getByRole('alert').filter({ hasText: mensaje })).toBeVisible();
    await expect(terminos(page)).not.toBeChecked();
    await expect(terminos(page)).toHaveAccessibleDescription(
      'Acepta los términos y condiciones para finalizar la compra.',
    );
    // La tienda vuelve a pedir el contenido para tener la versión vigente.
    expect(ajustes).toBeGreaterThan(antes);
    await expect(page.getByRole('heading', { name: 'Gracias por tu compra' })).toHaveCount(0);
  });
});

test.describe('PBI-0063 y PBI-0096: campos de entrega del checkout', () => {
  test('«Provincia», «Departamento» y la fecha vacíos muestran su mensaje', async ({ page }) => {
    await conCarrito(page, [{ productId: 'p-004', quantity: 1 }]);
    await page.goto('/checkout');
    await llenarCheckout(page);
    await page.getByRole('textbox', { name: 'Provincia' }).fill('');
    await page.getByRole('textbox', { name: 'Departamento' }).fill('');
    await page.getByLabel('Fecha de entrega preferida').fill('');
    await finalizar(page).click();

    await expect(page.getByRole('textbox', { name: 'Provincia' })).toHaveAccessibleDescription(
      'Ingresa la provincia.',
    );
    await expect(page.getByRole('textbox', { name: 'Departamento' })).toHaveAccessibleDescription(
      'Ingresa el departamento.',
    );
    await expect(page.getByLabel('Fecha de entrega preferida')).toHaveAccessibleDescription(
      'Elige una fecha de entrega.',
    );
    await expect(page.getByRole('heading', { name: 'Gracias por tu compra' })).toHaveCount(0);
  });

  test('una fecha anterior a la primera fecha de entrega muestra su mensaje y no se envía', async ({
    page,
  }) => {
    await conCarrito(page, [{ productId: 'p-004', quantity: 1 }]);
    await page.goto('/checkout');
    await llenarCheckout(page);
    // Lote 17 (PBI-0178): por defecto, la primera fecha es mañana en Lima; hoy ya no vale.
    await expect(page.getByLabel('Fecha de entrega preferida')).toHaveAttribute('min', fechaDeEntrega(1));
    await page.getByLabel('Fecha de entrega preferida').fill(fechaDeEntrega(0));
    await finalizar(page).click();
    await expect(page.getByLabel('Fecha de entrega preferida')).toHaveAccessibleDescription(
      `Elige una fecha desde el ${fechaDeEntrega(1).split('-').reverse().join('/')}.`,
    );
    await expect(page.getByRole('heading', { name: 'Gracias por tu compra' })).toHaveCount(0);
  });

  test('lote 17 (PBI-0178): el mínimo y la fecha propuesta son la primera fecha que da el BFF', async ({
    page,
  }) => {
    await page.route('**/bff/checkout/delivery-dates', (ruta) =>
      ruta.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ minimum: '2030-01-10' }),
      }),
    );
    await conCarrito(page, [{ productId: 'p-004', quantity: 1 }]);
    await page.goto('/checkout');
    const fecha = page.getByLabel('Fecha de entrega preferida');
    await expect(fecha).toHaveAttribute('min', '2030-01-10');
    await expect(fecha).toHaveValue('2030-01-10');
  });

  test('lote 17 (PBI-0178): por defecto, el mínimo es mañana en Lima, también de noche', async ({ page }) => {
    await conCarrito(page, [{ productId: 'p-004', quantity: 1 }]);
    await page.goto('/checkout');
    const manana = fechaDeEntrega(1);
    await expect(page.getByLabel('Fecha de entrega preferida')).toHaveAttribute('min', manana);
    await expect(page.getByLabel('Fecha de entrega preferida')).toHaveValue(manana);
  });
});

test.describe('PBI-0064 y PBI-0106: fallos de la compra y cambios del catálogo', () => {
  test('el error de stock no sigue en pantalla al volver a entrar al checkout', async ({ page }) => {
    await conCarrito(page, [{ productId: 'p-004', quantity: 1 }]);
    await page.route('**/bff/checkout/orders', (ruta) =>
      ruta.fulfill(
        problema(409, 'INSUFFICIENT_STOCK', 'No hay stock suficiente para completar el pedido.', {
          productId: 'p-004',
        }),
      ),
    );
    await page.goto('/checkout');
    await llenarCheckout(page);
    const catalogo = page.waitForRequest('**/bff/catalog/products');
    await finalizar(page).click();
    await expect(page.getByText('No hay stock suficiente para completar el pedido.')).toBeVisible();
    // Tras el fallo por stock, la tienda vuelve a pedir el catálogo.
    await catalogo;

    await page.getByRole('link', { name: 'Volver al carrito' }).click();
    await expect(page).toHaveURL('/carrito');
    await page.getByRole('main').getByRole('link', { name: 'Confirmar pedido' }).click();
    await expect(page).toHaveURL('/checkout');
    await expect(page.getByText('No hay stock suficiente para completar el pedido.')).toHaveCount(0);
  });

  test('si el precio cambia con la tienda abierta, se avisa y se cobra el total mostrado', async ({
    page,
  }) => {
    const original = (await leerProductos()).find((producto) => producto.id === 'p-005')!;
    try {
      await page.goto('/catalogo/monitor-ultrawide-34');
      await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Ver carrito' }).click();
      await expect(page.getByRole('main')).toContainText('S/ 1,499.00');

      // Otra sesión cambia el precio: al entrar al checkout, la tienda lo avisa y muestra el total nuevo.
      await actualizarProducto('p-005', { price: 1599 });
      await page.getByRole('main').getByRole('link', { name: 'Confirmar pedido' }).click();
      const avisos = page.getByRole('status').filter({ hasText: 'Actualizamos tu pedido' });
      await expect(avisos).toContainText(
        'El precio de Monitor UltraWide 34” cambió de S/ 1,499.00 a S/ 1,599.00.',
      );
      await llenarCheckout(page);
      await expect(page.getByRole('complementary')).toContainText('S/ 1,611.00');

      // Cambia otra vez con el checkout abierto: el BFF rechaza el total viejo y la tienda muestra el nuevo.
      await actualizarProducto('p-005', { price: 1650 });
      await finalizar(page).click();
      await expect(page.getByRole('alert')).toContainText('El total de tu pedido cambió');
      await expect(avisos).toContainText(
        'El precio de Monitor UltraWide 34” cambió de S/ 1,599.00 a S/ 1,650.00.',
      );
      await expect(page.getByRole('complementary')).toContainText('S/ 1,662.00');
      await finalizar(page).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Gracias por tu compra' })).toBeVisible();
      await expect(page.getByRole('main')).toContainText('S/ 1,662.00');
    } finally {
      await actualizarProducto('p-005', { price: original.price });
    }
  });
});

test.describe('PBI-0065 y PBI-0076: diálogo al agregar', () => {
  test('el foco inicial del diálogo está en «Ver carrito»', async ({ page }) => {
    await page.goto('/catalogo/soundbar-cinema-500');
    await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Ver carrito' })).toBeFocused();
  });

  test('con todo el stock en el carrito, el diálogo no dice «Producto agregado»', async ({ page }) => {
    // «Refrigeradora FreshMax 420 L» tiene 4 unidades y ya están en el carrito.
    await conCarrito(page, [{ productId: 'p-003', quantity: 4 }]);
    await page.goto('/catalogo/refrigeradora-freshmax-420-l');
    await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByRole('heading', { name: 'No se agregaron unidades' })).toBeVisible();
    await expect(dialogo).toContainText('Ya tienes en tu carrito las 4 unidades disponibles');
    await expect(dialogo.getByRole('heading', { name: 'Producto agregado' })).toHaveCount(0);
    await dialogo.getByRole('button', { name: 'Ver carrito' }).click();
    await expect(page.getByRole('main').locator('[aria-live="polite"]')).toHaveText('4');
  });

  test('si solo cabe una parte, el diálogo dice cuántas se agregaron', async ({ page }) => {
    await conCarrito(page, [{ productId: 'p-003', quantity: 3 }]);
    await page.goto('/catalogo/refrigeradora-freshmax-420-l');
    // La ficha topa la cantidad en el stock del producto, no en lo que falta: se piden 2 y solo cabe 1.
    await page.getByRole('button', { name: 'Aumentar cantidad' }).click();
    await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByRole('heading', { name: 'Producto agregado' })).toBeVisible();
    await expect(dialogo).toContainText('Agregamos 1 de las 2 unidades que pediste: es el stock disponible.');
  });
});

test.describe('PBI-0074: textos del carrito y del checkout', () => {
  test('el carrito y el checkout no hablan de «checkout» ni de «confirmar» el pedido', async ({ page }) => {
    await conCarrito(page, [{ productId: 'p-004', quantity: 1 }]);
    await page.goto('/carrito');
    await expect(page.getByRole('main')).toContainText('Se calcula al elegir el distrito');
    await expect(page.getByRole('main')).not.toContainText('Se calcula en checkout');
    await page.goto('/checkout');
    await expect(page.getByRole('main')).toContainText(
      'Puedes comprar sin crear una cuenta. Usaremos estos datos para registrar tu compra.',
    );
    await expect(page.getByRole('main')).not.toContainText('para confirmar tu pedido');
  });
});

test.describe('PBI-0086: doble clic en «Finalizar compra»', () => {
  test('un doble clic envía un solo pedido, con su clave de idempotencia', async ({ page }) => {
    await conCarrito(page, [{ productId: 'p-004', quantity: 1 }]);
    const enviados: Request[] = [];
    let soltar = () => {};
    const retenida = new Promise<void>((resolver) => (soltar = resolver));
    await page.route('**/bff/checkout/orders', async (ruta) => {
      enviados.push(ruta.request());
      await retenida;
      await ruta.continue();
    });
    await page.goto('/checkout');
    await llenarCheckout(page);
    await finalizar(page).dblclick();
    await expect(page.getByRole('button', { name: 'Procesando…' })).toBeDisabled();
    soltar();
    await expect(page.getByRole('heading', { level: 1, name: 'Gracias por tu compra' })).toBeVisible();
    expect(enviados).toHaveLength(1);
    expect(await enviados[0].headerValue('idempotency-key')).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
  });
});

test.describe('PBI-0092: líneas repetidas del carrito guardado', () => {
  test('dos líneas guardadas del mismo producto se ven como una con la suma', async ({ page }) => {
    await conCarrito(page, [
      { productId: 'p-004', quantity: 1 },
      { productId: 'p-004', quantity: 2 },
    ]);
    await page.goto('/carrito');
    const filas = page.getByRole('main').getByRole('article').filter({ hasText: 'Soundbar Cinema 500' });
    await expect(filas).toHaveCount(1);
    await expect(filas.locator('[aria-live="polite"]')).toHaveText('3');
    const guardado = await page.evaluate((clave) => localStorage.getItem(clave), CARRITO);
    expect(JSON.parse(guardado!)).toEqual([{ productId: 'p-004', quantity: 3 }]);
  });
});

test.describe('PBI-0104: pedidos hechos con la sesión iniciada', () => {
  test('al cerrar sesión no quedan a la vista ni guardados en el navegador', async ({ page }) => {
    const correo = correoUnico('lote04-cuenta');
    const contrasenia = 'Prueba2026x';
    const registro = await page.request.post(`${urls.bff}/bff/accounts`, {
      data: {
        fullName: 'Cuenta Lote 04',
        email: correo,
        phone: '987654321',
        document: '45678912',
        password: contrasenia,
      },
    });
    const { testCode } = await registro.json();
    expect(
      (
        await page.request.post(`${urls.bff}/bff/account-verifications`, {
          data: { email: correo, code: testCode },
        })
      ).ok(),
    ).toBe(true);

    await page.goto('/cuenta/login');
    await page.getByRole('textbox', { name: 'Correo' }).fill(correo);
    await page.getByRole('textbox', { name: 'Contraseña' }).fill(contrasenia);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL('/cuenta/perfil');

    await page.goto('/catalogo/soundbar-cinema-500');
    await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Ver carrito' }).click();
    await page.getByRole('main').getByRole('link', { name: 'Confirmar pedido' }).click();
    await llenarCheckout(page);
    await finalizar(page).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Gracias por tu compra' })).toBeVisible();
    const id = decodeURIComponent(page.url().split('/pedido/')[1]);
    const accesos = await page.evaluate((clave) => localStorage.getItem(clave) ?? '{}', ACCESOS);
    expect(JSON.parse(accesos)).not.toHaveProperty(id);

    await page.getByRole('link', { name: 'Ver pedido' }).click();
    await expect(page.getByRole('main')).toContainText(id);
    await page.goto('/cuenta/perfil');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL('/');

    // Sin recargar la página: lo que quedaba en memoria tampoco se ve.
    await page.getByRole('banner').getByRole('link', { name: 'Pedidos' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Mis pedidos' })).toBeVisible();
    await expect(page.getByText('Todavía no encontramos pedidos.')).toBeVisible();
    await expect(page.getByRole('main')).not.toContainText(id);
    await page.goto(`/pedidos/${encodeURIComponent(id)}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Pedido no encontrado' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancelar pedido' })).toHaveCount(0);
  });
});

test.describe('PBI-0107: cotización del envío al cambiar de distrito', () => {
  test('la respuesta tardía del primer distrito no reemplaza la del segundo', async ({ page }) => {
    await conCarrito(page, [{ productId: 'p-004', quantity: 1 }]);
    let soltarComas = () => {};
    const comasRetenida = new Promise<void>((resolver) => (soltarComas = resolver));
    await page.route('**/bff/shipping/quote?*', async (ruta) => {
      if (new URL(ruta.request().url()).searchParams.get('destination') === 'Comas') await comasRetenida;
      await ruta.continue();
    });
    await page.goto('/checkout');
    const distrito = page.getByRole('combobox', { name: 'Distrito destino' });
    await distrito.click();
    await page.getByRole('option', { name: 'Comas', exact: true }).click();
    await expect(page.getByText('Calculando costo de envío…')).toBeVisible();
    // La lista de opciones termina de cerrarse antes de volver a abrirla.
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await distrito.click();
    await page.getByRole('option', { name: 'Miraflores', exact: true }).click();
    await expect(page.getByText(/Envío cotizado:\s*S\/\s*12\.00/)).toBeVisible();

    const respuestaComas = page.waitForResponse((r) => r.url().includes('destination=Comas'));
    soltarComas();
    await respuestaComas;
    // Comas cuesta S/ 20.00: si su respuesta ganara, el resumen la mostraría con Miraflores elegido.
    await expect(page.getByText(/Envío cotizado:\s*S\/\s*12\.00/)).toBeVisible();
    await expect(page.getByRole('complementary')).toContainText('S/ 711.00');
    await expect(page.getByRole('complementary')).not.toContainText('S/ 20.00');
  });
});

test.describe('PBI-0110: cargando y error, distintos de vacío y de no existe', () => {
  test('el carrito guardado dice «Cargando» mientras carga el catálogo, no «vacío»', async ({ page }) => {
    await conCarrito(page, [{ productId: 'p-004', quantity: 1 }]);
    await page.route('**/bff/catalog/**', () => {});
    await page.goto('/carrito');
    await expect(page.getByRole('status').filter({ hasText: 'Cargando tu carrito…' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tu carrito está vacío' })).toHaveCount(0);
    await page.goto('/checkout');
    await expect(page.getByRole('status').filter({ hasText: 'Cargando tu carrito…' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No hay productos para comprar' })).toHaveCount(0);
  });

  test('si el catálogo falla, el carrito lo dice y «Reintentar» lo recupera', async ({ page }) => {
    await conCarrito(page, [{ productId: 'p-004', quantity: 1 }]);
    await page.route('**/bff/catalog/**', (ruta) => ruta.abort());
    await page.goto('/carrito');
    const error = page.getByRole('alert').filter({ hasText: 'No pudimos cargar tu carrito.' });
    await expect(error).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tu carrito está vacío' })).toHaveCount(0);

    await page.unroute('**/bff/catalog/**');
    await error.getByRole('button', { name: 'Reintentar' }).click();
    await expect(
      page.getByRole('main').getByRole('article').filter({ hasText: 'Soundbar Cinema 500' }),
    ).toBeVisible();
  });

  test('si el catálogo falla, la ficha no dice «Producto no encontrado»', async ({ page }) => {
    await page.route('**/bff/catalog/**', (ruta) => ruta.abort());
    await page.goto('/catalogo/soundbar-cinema-500');
    const error = page.getByRole('alert').filter({ hasText: 'No pudimos cargar el producto.' });
    await expect(error).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Producto no encontrado' })).toHaveCount(0);
    await page.unroute('**/bff/catalog/**');
    await error.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Soundbar Cinema 500' })).toBeVisible();
  });

  test('si fallan las tarifas, el checkout lo dice junto al distrito y permite reintentar', async ({
    page,
  }) => {
    await conCarrito(page, [{ productId: 'p-004', quantity: 1 }]);
    await page.route('**/bff/shipping/rates', (ruta) => ruta.abort());
    await page.goto('/checkout');
    const error = page.getByRole('alert').filter({ hasText: 'No pudimos cargar los distritos de entrega.' });
    await expect(error).toBeVisible();
    await page.unroute('**/bff/shipping/rates');
    await error.getByRole('button', { name: 'Reintentar' }).click();
    await expect(error).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Distrito destino' }).click();
    await expect(page.getByRole('option', { name: 'Miraflores', exact: true })).toBeVisible();
  });

  test('la confirmación de un pedido que no existe no dice «Pedido registrado»', async ({ page }) => {
    await page.goto('/pedido/NO-EXISTE');
    await expect(page.getByRole('heading', { level: 1, name: 'Pedido no encontrado' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pedido registrado' })).toHaveCount(0);
  });
});

test.describe('PBI-0143 y PBI-0096: cambios del pedido', () => {
  const ahora = Date.now();
  const pedido = (status: string) => ({
    id: 'WS-LOTE04',
    createdAt: new Date(ahora - 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(ahora - 60 * 60 * 1000).toISOString(),
    status,
    customer: { fullName: 'Ana Lote', email: 'ana@example.com', phone: '987654321', document: '45678912' },
    shipping: { addressLine: 'Av. Larco 123', district: 'Miraflores', province: 'Lima', department: 'Lima' },
    shippingOrigin: 'Lima Centro',
    deliveryDate: fechaDeEntrega(3),
    paymentMethod: 'card',
    items: [],
    subtotal: 699,
    igv: 106.63,
    shippingCost: 12,
    total: 711,
  });
  const servir = (page: Page, estado: () => string) =>
    page.route('**/bff/orders/WS-LOTE04', (ruta) =>
      ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pedido(estado())) }),
    );

  for (const [status, etiqueta] of [
    ['shipped', 'Enviado'],
    ['delivered', 'Entregado'],
    ['cancelled', 'Cancelado'],
  ]) {
    test(`un pedido ${etiqueta.toLowerCase()} no ofrece cambiar ni cancelar`, async ({ page }) => {
      await servir(page, () => status);
      await page.goto('/pedidos/WS-LOTE04');
      await expect(page.getByRole('main')).toContainText(etiqueta);
      await expect(page.getByRole('button', { name: 'Actualizar dirección' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Cancelar pedido' })).toHaveCount(0);
      await expect(page.getByRole('main')).not.toContainText('Ya pasaron las 24 horas');
    });
  }

  test('si el Admin lo envía mientras se mira, el 409 se explica y los botones desaparecen', async ({
    page,
  }) => {
    let estado = 'confirmed';
    await servir(page, () => estado);
    await page.route('**/bff/orders/WS-LOTE04/shipping', (ruta) => {
      estado = 'shipped';
      return ruta.fulfill(
        problema(
          409,
          'ORDER_NOT_MODIFIABLE',
          'El pedido ya se envió, se entregó o se canceló: no se puede cambiar.',
        ),
      );
    });
    await page.goto('/pedidos/WS-LOTE04');
    await page.getByRole('button', { name: 'Actualizar dirección' }).click();
    await expect(page.getByRole('alert')).toContainText(
      'El pedido ya se envió, se entregó o se canceló: no se puede cambiar.',
    );
    await expect(page.getByRole('button', { name: 'Actualizar dirección' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cancelar pedido' })).toHaveCount(0);
    await expect(page.getByRole('main')).toContainText('Enviado');
  });

  test('si la dirección se guarda y la fecha no, se dice qué cambió y qué no', async ({ page }) => {
    await servir(page, () => 'confirmed');
    await page.route('**/bff/orders/WS-LOTE04/shipping', async (ruta) =>
      ruta.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...pedido('confirmed'),
          shipping: { ...pedido('confirmed').shipping, addressLine: 'Av. Pardo 500' },
        }),
      }),
    );
    await page.route('**/bff/orders/WS-LOTE04/delivery-date', (ruta) =>
      ruta.fulfill(
        problema(400, 'INVALID_DELIVERY_DATE', 'Elige una fecha de entrega válida, desde hoy en adelante.'),
      ),
    );
    await page.goto('/pedidos/WS-LOTE04');
    await page.getByRole('textbox', { name: 'Dirección' }).fill('Av. Pardo 500');
    await page.getByLabel('Fecha de entrega').fill(fechaDeEntrega(5));
    await page.getByRole('button', { name: 'Actualizar dirección' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Actualizamos la dirección' })).toContainText(
      'Actualizamos la dirección, pero no la fecha de entrega.',
    );
    await expect(page.getByRole('alert')).toContainText(
      'Elige una fecha de entrega válida, desde hoy en adelante.',
    );
    await expect(page.getByText('Datos de entrega actualizados.')).toHaveCount(0);
  });

  test('si la fecha no cambió, solo se guarda la dirección', async ({ page }) => {
    await servir(page, () => 'confirmed');
    const fechas: Request[] = [];
    await page.route('**/bff/orders/WS-LOTE04/shipping', (ruta) =>
      ruta.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pedido('confirmed')),
      }),
    );
    await page.route('**/bff/orders/WS-LOTE04/delivery-date', (ruta) => {
      fechas.push(ruta.request());
      return ruta.abort();
    });
    await page.goto('/pedidos/WS-LOTE04');
    await page.getByRole('button', { name: 'Actualizar dirección' }).click();
    await expect(page.getByText('Datos de entrega actualizados.')).toBeVisible();
    expect(fechas).toHaveLength(0);
  });
});
