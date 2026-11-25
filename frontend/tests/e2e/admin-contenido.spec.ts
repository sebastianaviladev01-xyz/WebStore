import { expect, test, type Page } from '@playwright/test';

import { enviarCambios, leerSnapshot } from './apoyo/catalogo';
import { cuentasAdmin, ingresarAlAdmin, urls } from './apoyo/entorno';

/**
 * CMS compartido: desactivar una página informativa en Contenido la bloquea en el Storefront (el guard lleva al
 * inicio) y activarla de nuevo la vuelve a publicar. La prueba deja la página activada al terminar.
 */
const terminos = `${urls.storefront}/info/terminos`;

async function publicarTerminos(page: Page, activa: boolean): Promise<void> {
  await page.goto('/contenido');
  await expect(page.getByRole('heading', { level: 1, name: 'Contenido y configuración' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Términos y condiciones' }).setChecked(activa);
  await page.getByRole('button', { name: 'Guardar configuración' }).click();
  await expect(page.getByRole('status')).toHaveText('Configuración publicada en la tienda.');
}

test('desactivar Términos en el CMS bloquea la página en el Storefront', async ({ page, context }) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  const tienda = await context.newPage();

  try {
    await publicarTerminos(page, false);
    await tienda.goto(terminos);
    await expect(tienda).toHaveURL(`${urls.storefront}/`);
    await expect(tienda.getByRole('heading', { level: 1, name: 'Términos y condiciones' })).toHaveCount(0);
  } finally {
    await publicarTerminos(page, true);
  }

  await tienda.goto(terminos);
  await expect(tienda).toHaveURL(terminos);
  await expect(tienda.getByRole('heading', { level: 1, name: 'Términos y condiciones' })).toBeVisible();
});

// Lote 15 (ADR-0021): correos, teléfonos y redes (PBI-0169), avisos (PBI-0175) y accesos inferiores (PBI-0185) se
// editan como listas, con las reglas del BFF antes de enviar. La prueba deja las listas como estaban.
test('lote 15: Contenido edita correos, teléfonos, redes, avisos y accesos como listas y la tienda los recibe', async ({
  page,
}) => {
  const antes = (await leerSnapshot()).config;
  // Lote 20: al recargar tras guardar, las listas conservan sus filas; antes se volvían a crear (aviso NG0956).
  const ng0956: string[] = [];
  page.on('console', (mensaje) => {
    if (mensaje.text().includes('NG0956')) ng0956.push(mensaje.text());
  });
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  try {
    await page.goto('/contenido');
    await expect(page.getByRole('textbox', { name: 'Correo 1', exact: true })).toHaveValue(
      'contacto@webstore.demo',
    );
    await expect(page.getByRole('textbox', { name: 'Aviso 1', exact: true })).toHaveValue(
      'Despachos en Lima. Consulta cobertura y tarifas.',
    );
    await expect(page.getByRole('textbox', { name: 'Grupo 1', exact: true })).toHaveValue('Mi cuenta');

    await page.getByRole('button', { name: 'Agregar teléfono' }).click();
    const telefono = page.getByRole('textbox', { name: 'Teléfono 2', exact: true });
    await telefono.fill('llámanos');
    await telefono.blur();
    await expect(
      page.getByText('Usa de 6 a 15 dígitos; se admiten espacios, +, guiones y paréntesis.'),
    ).toBeVisible();
    await telefono.fill('(01) 555-0000');
    await page.getByRole('textbox', { name: 'Etiqueta del teléfono 2', exact: true }).fill('Soporte');

    await page.getByRole('button', { name: 'Agregar aviso' }).click();
    await page.getByRole('textbox', { name: 'Aviso 2', exact: true }).fill('Mantenimiento el domingo');
    const enlace = page.getByRole('textbox', { name: 'Enlace del aviso 2', exact: true });
    await enlace.fill('catalogo');
    await enlace.blur();
    await expect(
      page.getByText('Usa una ruta de la tienda (/catalogo) o una dirección https://, o déjalo vacío.'),
    ).toBeVisible();
    await enlace.fill('/catalogo');
    await page.getByRole('button', { name: 'Subir aviso 2' }).click();
    await expect(page.getByRole('textbox', { name: 'Aviso 1', exact: true })).toHaveValue(
      'Mantenimiento el domingo',
    );

    await page.getByRole('button', { name: 'Agregar red' }).click();
    await page.getByRole('textbox', { name: 'Nombre de la red 1', exact: true }).fill('Instagram');
    await page
      .getByRole('textbox', { name: 'Dirección de la red 1', exact: true })
      .fill('https://www.instagram.com/webstore');

    // El pie admite hasta tres grupos además de Productos: un cuarto se avisa y no se envía.
    await page.getByRole('button', { name: 'Agregar acceso' }).click();
    await page.getByRole('textbox', { name: 'Grupo 11', exact: true }).fill('Extra');
    await expect(
      page.getByRole('alert').filter({ hasText: 'El pie admite hasta tres grupos' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Quitar acceso 11' }).click();

    await page.getByRole('button', { name: 'Guardar configuración' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Configuración publicada en la tienda.' }),
    ).toBeVisible();

    const publicas = await (await page.request.get(`${urls.bff}/bff/content/settings`)).json();
    expect(publicas.contactPhones[1]).toEqual({ value: '(01) 555-0000', label: 'Soporte' });
    expect(publicas.announcements.slice(0, 2)).toEqual([
      { text: 'Mantenimiento el domingo', url: '/catalogo' },
      { text: 'Despachos en Lima. Consulta cobertura y tarifas.', url: '' },
    ]);
    expect(publicas.socialLinks).toEqual([{ label: 'Instagram', url: 'https://www.instagram.com/webstore' }]);
    expect(publicas.quickLinks).toEqual(antes['quickLinks']);
    // Lo guardado sigue en el formulario, en su orden, y ninguna lista se volvió a crear entera.
    await expect(page.getByRole('textbox', { name: 'Aviso 1', exact: true })).toHaveValue(
      'Mantenimiento el domingo',
    );
    await expect(page.getByRole('textbox', { name: 'Teléfono 2', exact: true })).toHaveValue('(01) 555-0000');
    expect(ng0956).toEqual([]);
  } finally {
    await enviarCambios({
      config: {
        contactPhones: antes['contactPhones'],
        announcements: antes['announcements'],
        socialLinks: antes['socialLinks'],
      },
    });
  }
});

// Lote 16 (ADR-0021, PBI-0179): Contenido elige dónde muestra la tienda los sugeridos; por defecto, el diálogo. La
// prueba deja el diálogo al terminar.
test('lote 16: Contenido elige el panel lateral para los sugeridos y la tienda lo usa al agregar', async ({
  page,
  context,
}) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  const tienda = await context.newPage();
  try {
    await page.goto('/contenido');
    const lugares = page.getByRole('radiogroup', { name: 'Productos sugeridos al agregar al carrito' });
    await expect(lugares.getByRole('radio', { name: 'En el diálogo' })).toBeChecked();
    await lugares.getByRole('radio', { name: 'En un panel lateral' }).check();
    await page.getByRole('button', { name: 'Guardar configuración' }).click();
    await expect(page.getByRole('status')).toHaveText('Configuración publicada en la tienda.');
    expect((await leerSnapshot()).config['addToCartDisplay']).toBe('side-panel');

    await tienda.goto(`${urls.storefront}/catalogo/oled-vision-55-4k`);
    await tienda.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
    const panel = tienda.getByRole('dialog', { name: 'Producto agregado' });
    await expect(panel.getByRole('button', { name: 'Cerrar' })).toBeVisible();
    const caja = (await panel.boundingBox())!;
    expect(Math.round(caja.x + caja.width)).toBe(tienda.viewportSize()!.width);
  } finally {
    await enviarCambios({ config: { addToCartDisplay: 'dialog' } });
  }
});

// Lote 30 (ADR-0027, PBI-0244; provisional): cada aviso lleva un «Desde» y un «Hasta» opcionales, con fecha y hora de
// Lima, y Contenido marca su estado. Un «Hasta» que no va después del «Desde» se avisa en la fila y no se envía. La
// tienda solo recibe los vigentes. La prueba deja los avisos como estaban.
test('PBI-0244: Contenido programa un aviso con «Desde» y «Hasta» en hora de Lima y marca su estado', async ({
  page,
}) => {
  const antes = (await leerSnapshot()).config['announcements'];
  const vencido = { text: 'Aviso vencido en 2020', url: '', endAt: '2020-12-31T23:59:59.999-05:00' };
  await enviarCambios({ config: { announcements: [{ text: 'Aviso fijo', url: '' }, vencido] } });
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  try {
    await page.goto('/contenido');
    await expect(page.getByText('Estado del aviso 1: Vigente')).toBeVisible();
    await expect(page.getByText('Estado del aviso 2: Vencido')).toBeVisible();
    await expect(page.getByLabel('Desde (aviso 2)')).toHaveValue('');
    // El 31/12/2020 a las 23:59 en Lima, no en UTC.
    await expect(page.getByLabel('Hasta (aviso 2)')).toHaveValue('2020-12-31T23:59');

    await page.getByRole('button', { name: 'Agregar aviso' }).click();
    await page.getByRole('textbox', { name: 'Aviso 3', exact: true }).fill('Black Friday 2099');
    const desde = page.getByLabel('Desde (aviso 3)');
    const hasta = page.getByLabel('Hasta (aviso 3)');
    await expect(desde).toHaveAttribute('type', 'datetime-local');
    await expect(desde).toHaveAccessibleDescription(/Opcional\. Fecha y hora de Lima\./);
    await expect(hasta).toHaveAccessibleDescription(/Opcional\. Fecha y hora de Lima\./);
    await desde.fill('2099-11-27T00:00');
    await hasta.fill('2099-11-26T23:59');
    const motivo = page
      .getByRole('alert')
      .filter({ hasText: 'El «Hasta» tiene que ser posterior al «Desde».' });
    await expect(motivo).toBeVisible();
    await page.getByRole('button', { name: 'Guardar configuración' }).click();
    await expect(page.getByText('Configuración publicada en la tienda.')).toHaveCount(0);

    await hasta.fill('2099-11-27T23:59');
    await expect(motivo).toHaveCount(0);
    await expect(page.getByText('Estado del aviso 3: Programado')).toBeVisible();
    await page.getByRole('button', { name: 'Guardar configuración' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Configuración publicada en la tienda.' }),
    ).toBeVisible();

    // El Admin guarda todos, con la zona de Lima; el vencido conserva su instante tal cual.
    expect((await leerSnapshot()).config['announcements']).toEqual([
      { text: 'Aviso fijo', url: '' },
      vencido,
      {
        text: 'Black Friday 2099',
        url: '',
        startAt: '2099-11-27T00:00:00.000-05:00',
        endAt: '2099-11-27T23:59:59.999-05:00',
      },
    ]);
    // La tienda solo recibe el vigente.
    const publicas = await (await page.request.get(`${urls.bff}/bff/content/settings`)).json();
    expect(publicas.announcements).toEqual([{ text: 'Aviso fijo', url: '' }]);
  } finally {
    await enviarCambios({ config: { announcements: antes } });
  }
});
