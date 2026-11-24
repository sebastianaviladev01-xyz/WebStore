import { expect, test, type Page } from '@playwright/test';

/**
 * Contenido en la tienda (lote 15, ADR-0021). Las respuestas del BFF se cambian solo en la prueba (`page.route`), así
 * no se tocan los datos:
 * - PBI-0175: la barra superior muestra los avisos de Contenido; con varios, se cambian con las flechas y se pausan.
 * - PBI-0169: varios correos, teléfonos y redes en el pie y en Contacto; las redes se abren en otra pestaña.
 * - PBI-0185: las columnas del pie salen de los «Accesos inferiores»; con la semilla, son las de antes.
 */

/** La tienda con estos ajustes de Contenido sobre los del BFF. */
async function conAjustes(page: Page, cambios: Record<string, unknown>): Promise<void> {
  await page.route('**/bff/content/settings', async (ruta) => {
    const respuesta = await ruta.fetch();
    await ruta.fulfill({ response: respuesta, json: { ...(await respuesta.json()), ...cambios } });
  });
}

test('PBI-0175: con la semilla, la barra superior muestra un aviso fijo, sin flechas ni pausa', async ({
  page,
}) => {
  await page.goto('/');
  const avisos = page.getByRole('region', { name: 'Avisos de la tienda' });
  await expect(avisos).toHaveText('Despachos en Lima. Consulta cobertura y tarifas.');
  await expect(avisos.getByRole('button')).toHaveCount(0);
  // Envíos sigue junto a las categorías, ahora fijo en la cabecera.
  await expect(page.getByRole('banner').getByRole('link', { name: 'Envíos' })).toBeVisible();
});

test('PBI-0175: con varios avisos, se cambian con las flechas, se pausan y su enlace lleva a la tienda', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await conAjustes(page, {
    announcements: [
      { text: 'Mantenimiento programado el domingo', url: '' },
      { text: 'Ofertas de verano en TV', url: '/catalogo?categoria=cat-tv' },
      { text: 'Síguenos en Instagram', url: 'https://www.instagram.com/webstore' },
    ],
  });
  await page.goto('/');
  const avisos = page.getByRole('region', { name: 'Avisos de la tienda' });
  await expect(avisos.getByText('Mantenimiento programado el domingo')).toBeVisible();
  // Con «reducir movimiento» no pasan solos: empiezan en pausa.
  await expect(avisos.getByRole('button', { name: 'Reanudar avisos' })).toBeVisible();

  await avisos.getByRole('button', { name: 'Aviso anterior' }).click();
  const externo = avisos.getByRole('link', { name: /Síguenos en Instagram/ });
  await expect(externo).toHaveAttribute('target', '_blank');
  await expect(externo).toHaveAttribute('rel', 'noopener noreferrer');

  await avisos.getByRole('button', { name: 'Aviso siguiente' }).click();
  await avisos.getByRole('button', { name: 'Aviso siguiente' }).click();
  await avisos.getByRole('link', { name: 'Ofertas de verano en TV' }).click();
  await expect(page).toHaveURL(/\/catalogo\?categoria=cat-tv$/);

  await avisos.getByRole('button', { name: 'Reanudar avisos' }).click();
  await expect(avisos.getByRole('button', { name: 'Pausar avisos' })).toBeVisible();
});

test('PBI-0175: sin avisos, la barra superior no muestra la región de avisos', async ({ page }) => {
  await conAjustes(page, { announcements: [] });
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Avisos de la tienda' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
});

test('PBI-0169: el pie y Contacto muestran todos los correos y teléfonos, y las redes en otra pestaña', async ({
  page,
}) => {
  await conAjustes(page, {
    contactEmails: [
      { value: 'contacto@webstore.demo', label: '' },
      { value: 'ventas@webstore.demo', label: 'Ventas' },
    ],
    contactPhones: [
      { value: '+51 999 000 000', label: '' },
      { value: '(01) 555-0000', label: 'Soporte' },
    ],
    socialLinks: [{ label: 'Instagram', url: 'https://www.instagram.com/webstore' }],
  });
  await page.goto('/info/contacto');
  const pie = page.getByRole('contentinfo');
  await expect(pie.getByRole('link', { name: 'Ventas: ventas@webstore.demo' })).toHaveAttribute(
    'href',
    'mailto:ventas@webstore.demo',
  );
  await expect(pie.getByRole('link', { name: 'Soporte: (01) 555-0000' })).toHaveAttribute(
    'href',
    'tel:015550000',
  );
  const red = pie.getByRole('list', { name: 'Redes sociales' }).getByRole('link', { name: /Instagram/ });
  await expect(red).toHaveAttribute('target', '_blank');
  await expect(red).toHaveAttribute('rel', 'noopener noreferrer');

  const principal = page.getByRole('main');
  await expect(principal.getByText('Correos', { exact: true })).toBeVisible();
  await expect(principal.getByText('ventas@webstore.demo')).toBeVisible();
  await expect(principal.getByText('Teléfonos', { exact: true })).toBeVisible();
  await expect(principal.getByText('(01) 555-0000')).toBeVisible();
  await expect(principal.getByRole('link', { name: /Instagram/ })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
});

test('PBI-0185: con la semilla, el pie tiene las columnas de antes; los accesos de Contenido las cambian', async ({
  page,
}) => {
  await page.goto('/');
  const pie = page.getByRole('contentinfo');
  for (const titulo of ['Productos', 'Mi cuenta', 'Información', 'Ayuda'])
    await expect(pie.getByRole('heading', { level: 2, name: titulo })).toBeVisible();
  await expect(pie.getByRole('link', { name: 'Recuperar acceso' })).toHaveAttribute(
    'href',
    '/cuenta/recuperar',
  );

  await conAjustes(page, {
    quickLinks: [
      { group: 'Ayuda', label: 'Contacto', url: '/info/contacto' },
      { group: 'Síguenos', label: 'Blog de la tienda', url: 'https://blog.webstore.demo' },
    ],
  });
  await page.reload();
  await expect(pie.getByRole('heading', { level: 2, name: 'Mi cuenta' })).toHaveCount(0);
  await expect(pie.getByRole('heading', { level: 2, name: 'Síguenos' })).toBeVisible();
  const blog = pie.getByRole('link', { name: /Blog de la tienda/ });
  await expect(blog).toHaveAttribute('target', '_blank');
  await expect(blog).toHaveAttribute('rel', 'noopener noreferrer');
  await pie.getByRole('link', { name: 'Contacto', exact: true }).click();
  await expect(page).toHaveURL(/\/info\/contacto$/);
});

// Lote 20 (ADR-0021, hallazgo del lote 17): la página de Términos dice qué versión está vigente y cuándo se publicó,
// porque el comprador acepta ese número en el checkout (PBI-0177). La fecha es la de Lima; sin fecha, solo la versión.
test.describe('Términos: la versión vigente y su fecha', () => {
  test('con fecha de publicación, «Versión N · publicada el DD/MM/AAAA», en hora de Lima', async ({
    page,
  }) => {
    // 02:30 UTC del 1 de marzo es aún 28 de febrero en Lima.
    await conAjustes(page, { termsVersion: 3, termsPublishedAt: '2026-03-01T02:30:00.000Z' });
    await page.goto('/info/terminos');
    await expect(page.getByRole('main').getByText(/^Versión \d/)).toHaveText(
      'Versión 3 · publicada el 28/02/2026',
    );
  });

  test('sin fecha de publicación, solo la versión', async ({ page }) => {
    await conAjustes(page, { termsVersion: 1, termsPublishedAt: null });
    await page.goto('/info/terminos');
    await expect(page.getByRole('main').getByText(/^Versión \d/)).toHaveText('Versión 1');
  });
});
