import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';

import { leerProductos } from './apoyo/catalogo';
import { correoUnico, fechaDeEntrega, urls } from './apoyo/entorno';

/**
 * Lote 05 (ADR-0017), tienda: cuenta y formularios. Verificar la cuenta con el reenvío del código, sin el código en
 * la URL (PBI-0098); campos con contorno (PBI-0047); mensajes de error en cada campo y nombres accesibles
 * (PBI-0113); sesión vencida y BFF caído en la cuenta (PBI-0114); constancia del libro de reclamaciones con la fecha
 * límite (PBI-0112) y fecha de entrega del detalle del pedido (PBI-0146).
 */
const CONTRASENA = 'Prueba2026x';
const SIN_RELLENO = 'rgba(0, 0, 0, 0)';

async function registrar(page: Page, correo: string): Promise<void> {
  await page.goto('/cuenta/registro');
  await page.getByRole('textbox', { name: 'Nombres y apellidos' }).fill('Cliente Lote Cinco');
  await page.getByRole('textbox', { name: 'Correo' }).fill(correo);
  await page.getByRole('textbox', { name: 'Teléfono' }).fill('987654321');
  await page.getByRole('textbox', { name: 'DNI' }).fill('45678912');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(CONTRASENA);
  await page.getByRole('button', { name: 'Registrar y verificar correo' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Verifica tu cuenta' })).toBeVisible();
}

const codigoDeDemostracion = async (page: Page): Promise<string> => {
  const canal = page.getByText('Canal local de demostración:').locator('..');
  await expect(canal).toHaveText(/\d{6}/);
  return (await canal.textContent())?.match(/\d{6}/)?.[0] ?? '';
};

async function cuentaVerificada(request: APIRequestContext): Promise<{ correo: string; token: string }> {
  const correo = correoUnico('lote05');
  const alta = await request.post(`${urls.bff}/bff/accounts`, {
    data: {
      fullName: 'Cliente Lote Cinco',
      email: correo,
      phone: '987654321',
      document: '45678912',
      password: CONTRASENA,
    },
  });
  const { testCode } = await alta.json();
  await request.post(`${urls.bff}/bff/account-verifications`, { data: { email: correo, code: testCode } });
  const sesion = await request.post(`${urls.bff}/bff/account-sessions`, {
    data: { email: correo, password: CONTRASENA },
  });
  return { correo, token: (await sesion.json()).token };
}

async function ingresar(page: Page, correo: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Correo' }).fill(correo);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(CONTRASENA);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
}

/** Fondo del campo de Material que contiene al control: sin relleno, es un campo con contorno. */
const rellenoDe = (control: Locator) =>
  control.evaluate((el) => {
    const campo = el.closest('.mdc-text-field');
    return campo ? getComputedStyle(campo).backgroundColor : null;
  });

test.describe('PBI-0098: verificar la cuenta', () => {
  test('el código no viaja en la URL y se puede pedir uno nuevo desde la página', async ({ page }) => {
    const correo = correoUnico('verificar');
    await registrar(page, correo);
    await expect(page.getByRole('textbox', { name: 'Correo' })).toHaveValue(correo);
    const primero = await codigoDeDemostracion(page);
    expect(new URL(page.url()).searchParams.get('demoCode')).toBeNull();
    expect(page.url()).not.toContain(primero);

    // Sin el correo en la URL (otra pestaña, o después de recargar) se escribe y se pide un código nuevo.
    await page.goto('/cuenta/verificar');
    await expect(page.getByText(/inicia sesión para recibir un código nuevo/i)).toHaveCount(0);
    await page.getByRole('textbox', { name: 'Correo' }).fill(correo);
    await page.getByRole('button', { name: 'Enviar un código nuevo' }).click();
    await expect(page.getByRole('status')).toContainText('Si hay una cuenta sin verificar con ese correo');
    const segundo = await codigoDeDemostracion(page);
    expect(segundo).not.toBe(primero);

    await page.getByRole('textbox', { name: 'Código' }).fill(segundo);
    await page.getByRole('button', { name: 'Verificar cuenta' }).click();
    await expect(page).toHaveURL(/\/cuenta\/login/);
    await ingresar(page, correo);
    await expect(page).toHaveURL('/cuenta/perfil');
  });

  test('ingresar con una cuenta sin verificar ofrece ir a verificarla', async ({ page }) => {
    const correo = correoUnico('sin-verificar');
    await registrar(page, correo);
    await page.goto('/cuenta/login');
    await ingresar(page, correo);
    await expect(page.getByRole('alert')).toContainText('Verifica tu cuenta');
    await page.getByRole('link', { name: 'Verificar mi cuenta' }).click();
    await expect(page).toHaveURL(/\/cuenta\/verificar/);
    await expect(page.getByRole('textbox', { name: 'Correo' })).toHaveValue(correo);
  });
});

test.describe('PBI-0047: campos con contorno', () => {
  const formularios: readonly { ruta: string; campo: string }[] = [
    { ruta: '/cuenta/login', campo: 'Correo' },
    { ruta: '/cuenta/registro', campo: 'Nombres y apellidos' },
    { ruta: '/cuenta/verificar', campo: 'Código' },
    { ruta: '/cuenta/recuperar', campo: 'Correo' },
    { ruta: '/libro-reclamaciones', campo: 'Nombre completo' },
  ];
  for (const { ruta, campo } of formularios) {
    test(`${ruta} usa campos sin relleno`, async ({ page }) => {
      await page.goto(ruta);
      const controles = page.getByRole('main').getByRole('textbox');
      await expect(page.getByRole('textbox', { name: campo })).toBeVisible();
      for (const control of await controles.all()) expect(await rellenoDe(control)).toBe(SIN_RELLENO);
    });
  }
});

test.describe('PBI-0113: mensajes de error y nombres accesibles', () => {
  test('ingresar, registro y recuperar dicen qué falta en cada campo', async ({ page }) => {
    await page.goto('/cuenta/login');
    await expect(page.getByRole('textbox', { name: 'Correo' })).toHaveAttribute('autocomplete', 'email');
    await expect(page.getByRole('textbox', { name: 'Contraseña' })).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    const correo = page.getByRole('textbox', { name: 'Correo' });
    await expect(correo).toHaveAccessibleDescription('Ingresa tu correo.');
    await expect(page.getByRole('textbox', { name: 'Contraseña' })).toHaveAccessibleDescription(
      'Ingresa tu contraseña.',
    );
    await correo.fill('no-es-un-correo');
    await correo.blur();
    // Vacío, Material marca el campo con aria-required y no con aria-invalid; con un valor incorrecto, sí.
    await expect(correo).toHaveAttribute('aria-invalid', 'true');
    await expect(correo).toHaveAccessibleDescription('Ingresa un correo válido.');

    await page.goto('/cuenta/registro');
    await page.getByRole('button', { name: 'Registrar y verificar correo' }).click();
    await expect(page.getByRole('textbox', { name: 'Nombres y apellidos' })).toHaveAccessibleDescription(
      'Ingresa tu nombre y apellidos.',
    );
    await expect(page.getByRole('textbox', { name: 'DNI' })).toHaveAccessibleDescription(
      'Ingresa tu DNI (al menos 8 caracteres).',
    );
    const contrasena = page.getByRole('textbox', { name: 'Contraseña' });
    await contrasena.fill('corta');
    await contrasena.blur();
    await expect(contrasena).toHaveAccessibleDescription(
      'Usa al menos 10 caracteres e incluye una letra y un número.',
    );

    await page.goto('/cuenta/recuperar');
    await page.getByRole('button', { name: 'Enviar código' }).click();
    await expect(page.getByRole('textbox', { name: 'Correo' })).toHaveAccessibleDescription(
      'Ingresa tu correo.',
    );
  });

  test('el carrito nombra el grupo de la cantidad y el checkout el de los métodos de pago', async ({
    page,
  }) => {
    await page.goto('/catalogo/soundbar-cinema-500');
    await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Ver carrito' }).click();
    const grupo = page.getByRole('group', { name: 'Cantidad de Soundbar Cinema 500' });
    await expect(
      grupo.getByRole('button', { name: 'Aumentar cantidad de Soundbar Cinema 500' }),
    ).toBeVisible();
    await page.goto('/checkout');
    await expect(page.getByRole('radiogroup', { name: 'Método de pago' })).toBeVisible();
  });
});

test.describe('PBI-0114: sesión vencida y BFF caído', () => {
  test('si la sesión vence, guardar lleva a ingresar con un aviso y vuelve al perfil', async ({
    page,
    request,
  }) => {
    const { correo, token } = await cuentaVerificada(request);
    await page.addInitScript((t) => {
      if (!sessionStorage.getItem('lote05-iniciado')) {
        sessionStorage.setItem('webstore-account-session-v1', t);
        sessionStorage.setItem('lote05-iniciado', '1');
      }
    }, token);
    await page.goto('/cuenta/perfil');
    await expect(page.getByRole('heading', { level: 1, name: 'Datos personales' })).toBeVisible();

    // La sesión se revoca en el BFF (vence) mientras la página sigue abierta.
    await request.delete(`${urls.bff}/bff/account-sessions/current`, {
      headers: { authorization: `Bearer ${token}` },
    });
    await page.getByRole('textbox', { name: 'Teléfono' }).fill('912345678');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page).toHaveURL('/cuenta/login?volver=%2Fcuenta%2Fperfil');
    await expect(page.getByRole('status')).toHaveText('Tu sesión venció. Ingresa de nuevo para continuar.');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Ingresar' })).toBeVisible();
    await ingresar(page, correo);
    await expect(page).toHaveURL('/cuenta/perfil');
  });

  test('al abrir el perfil con la sesión vencida también lleva a ingresar', async ({ page, request }) => {
    const { token } = await cuentaVerificada(request);
    await request.delete(`${urls.bff}/bff/account-sessions/current`, {
      headers: { authorization: `Bearer ${token}` },
    });
    await page.addInitScript((t) => sessionStorage.setItem('webstore-account-session-v1', t), token);
    await page.goto('/cuenta/perfil');
    await expect(page).toHaveURL('/cuenta/login?volver=%2Fcuenta%2Fperfil');
    await expect(page.getByRole('status')).toHaveText('Tu sesión venció. Ingresa de nuevo para continuar.');
  });

  test('con el BFF caído al recargar, el token se conserva y se puede reintentar', async ({
    page,
    request,
  }) => {
    const { token } = await cuentaVerificada(request);
    await page.addInitScript((t) => sessionStorage.setItem('webstore-account-session-v1', t), token);
    await page.route('**/bff/account-sessions/current', (r) => r.abort('connectionrefused'));
    await page.goto('/cuenta/perfil');
    await expect(page.getByRole('alert')).toContainText('No pudimos cargar tu cuenta');
    expect(await page.evaluate(() => sessionStorage.getItem('webstore-account-session-v1'))).toBe(token);

    await page.unroute('**/bff/account-sessions/current');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Datos personales' })).toBeVisible();
  });
});

test.describe('PBI-0112: constancia del libro de reclamaciones', () => {
  test('muestra la fecha límite de respuesta y el tipo con mayúscula', async ({ page }) => {
    await page.goto('/libro-reclamaciones');
    await page.getByRole('textbox', { name: 'Nombre completo' }).fill('Cliente Lote Cinco');
    await page.getByRole('textbox', { name: 'DNI / documento' }).fill('45678912');
    await page.getByRole('textbox', { name: 'Correo' }).fill(correoUnico('reclamo'));
    await page.getByRole('textbox', { name: 'Teléfono' }).fill('987654321');
    await page.getByRole('textbox', { name: 'Domicilio' }).fill('Av. Primavera 123');
    await page.getByRole('textbox', { name: 'Producto o servicio' }).fill('Barra de sonido');
    await page.getByRole('textbox', { name: 'Detalle de lo ocurrido' }).fill('Llegó con la caja abierta.');
    await page.getByRole('textbox', { name: 'Pedido del consumidor' }).fill('Cambio del producto.');
    await page.getByRole('button', { name: 'Registrar solicitud' }).click();

    const constancia = page.getByRole('status').filter({ hasText: 'Solicitud registrada' });
    await expect(constancia.getByRole('definition').first()).toHaveText(/^REC-\d{4}-\d{5}$/);
    const limite = constancia.getByRole('term').filter({ hasText: 'Fecha límite de respuesta' });
    await expect(limite).toBeVisible();
    await expect(constancia).toContainText(/Fecha límite de respuesta\s*\d{1,2} [a-z]{3}\.? \d{4}/);
    await expect(constancia.getByRole('definition').filter({ hasText: /^Reclamo$/ })).toBeVisible();
  });
});

test.describe('PBI-0146 y PBI-0113: detalle del pedido', () => {
  test('la fecha de entrega lleva mínimo y mensaje, y los campos dicen qué falta', async ({
    page,
    request,
  }) => {
    const soundbar = (await leerProductos()).find(
      (p) => p.sku.startsWith('SB-') || p.name.includes('Soundbar'),
    )!;
    const compra = await request.post(`${urls.bff}/bff/checkout/orders`, {
      data: {
        customer: {
          fullName: 'Invitado Lote Cinco',
          email: correoUnico('pedido'),
          phone: '987654321',
          document: '45678912',
        },
        shipping: {
          addressLine: 'Av. Primavera 123',
          district: 'Miraflores',
          province: 'Lima',
          department: 'Lima',
        },
        deliveryDate: fechaDeEntrega(),
        paymentMethod: 'card',
        items: [{ productId: soundbar.id, quantity: 1 }],
        termsAccepted: true,
      },
    });
    expect(compra.status()).toBe(201);
    const pedido = await compra.json();
    await page.addInitScript(
      ([id, token]) => localStorage.setItem('webstore-order-access-v1', JSON.stringify({ [id]: token })),
      [pedido.id, pedido.accessToken] as const,
    );
    // PBI-0026: la foto de la línea no avisa NG02952 (proporción distinta de la de la imagen).
    const avisos: string[] = [];
    page.on('console', (m) => {
      if (m.text().includes('NG02952')) avisos.push(m.text().slice(0, 120));
    });
    await page.goto(`/pedidos/${pedido.id}`);
    await expect(page.getByRole('heading', { level: 1, name: pedido.id })).toBeVisible();
    await expect(page.getByRole('img', { name: soundbar.name })).toBeVisible();
    await page.waitForTimeout(500);
    expect(avisos).toEqual([]);

    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
    const fecha = page.getByLabel('Fecha de entrega');
    await expect(fecha).toHaveAttribute('min', hoy);
    expect(await rellenoDe(fecha)).toBe(SIN_RELLENO);

    let cambios = 0;
    page.on('request', (r) => {
      if (r.method() === 'PATCH') cambios++;
    });
    await fecha.fill('2020-01-01');
    await page.getByRole('textbox', { name: 'Dirección' }).fill('');
    await page.getByRole('button', { name: 'Actualizar dirección' }).click();
    await expect(fecha).toHaveAccessibleDescription('Elige una fecha desde hoy.');
    await expect(page.getByRole('textbox', { name: 'Dirección' })).toHaveAccessibleDescription(
      'Ingresa la dirección.',
    );
    expect(cambios).toBe(0);
  });
});
