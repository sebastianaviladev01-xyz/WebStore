import { expect, test, type Page } from '@playwright/test';

import { cuentasAdmin, desplegarGrupo, ingresarAlAdmin } from './apoyo/entorno';

/**
 * Lote 47 (ADR-0033, PBI-0267): «Revisión de contraste» explica la relación y sugiere un color que cumple. Daniel no
 * entendía «1.4:1» ni «4.5:1»: «tiene que ir con sugerencia», «que sea explicativo, informativo para el usuario». Con un
 * principal gris medio, el texto de los botones principales queda en 4.4:1: la revisión dice dónde se ve y propone el
 * gris más cercano que llega a 4.5:1; al usarlo, el campo cambia y el aviso desaparece. La prueba no guarda.
 */
/** Los colores de B con el principal en un gris medio: la base es la de B, así que hereda su escala neutra. */
const COLORES = {
  Principal: '#777777',
  Secundario: '#C2410C',
  'Fondo principal': '#F3F5F8',
  'Fondo secundario': '#FFFFFF',
  Contraste: '#0F172A',
} as const;

const dialogo = (page: Page) => page.getByRole('dialog');
const codigo = (page: Page, color: string) =>
  dialogo(page).getByRole('textbox', { name: `Código hexadecimal de ${color}`, exact: true });

test('PBI-0267: el contraste se explica, el aviso dice dónde se ve y «Usar …» aplica el color sugerido', async ({
  page,
}) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await desplegarGrupo(page, 'Tienda');
  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('link', { name: 'Temas', exact: true })
    .click();
  await page.getByRole('button', { name: 'Nuevo tema' }).click();
  const formulario = dialogo(page);
  await expect(formulario.getByRole('heading', { name: 'Nuevo tema' })).toBeVisible();

  // La explicación está siempre a la vista, también sin avisos.
  const revision = formulario.getByRole('region', { name: 'Revisión de contraste' });
  await expect(revision).toContainText('va de 1:1 (iguales) a 21:1 (negro sobre blanco)');
  await expect(revision).toContainText('al menos 4.5:1 para el texto y 3:1 para los bordes y los controles');

  for (const [color, valor] of Object.entries(COLORES)) await codigo(page, color).fill(valor);

  const aviso = formulario.locator('[data-contraste="aviso"]');
  await expect(aviso).toContainText('Texto sobre el color principal: 4.4:1, mínimo 4.5:1');
  await expect(aviso).toContainText('Se ve en el texto de los botones principales.');
  await expect(aviso).toContainText('Para que llegue, oscurece el color «Principal»:');
  await expect(formulario.getByText(/al menos 4\.5:1 para el texto/)).toHaveCount(1);

  await aviso.getByRole('button', { name: 'Usar #767676' }).click();
  await expect(codigo(page, 'Principal')).toHaveValue('#767676');
  await expect(codigo(page, 'Principal')).toBeFocused();
  await expect(formulario.getByLabel('Principal', { exact: true })).toHaveValue('#767676');
  await expect(aviso).toHaveCount(0);
  await expect(formulario.locator('[data-contraste="correcto"]')).toBeVisible();
  await expect(formulario.getByRole('button', { name: 'Guardar tema' })).toBeEnabled();
});

test('PBI-0267: un bloqueo también sugiere el color, sin crear otro bloqueo', async ({ page }) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await desplegarGrupo(page, 'Tienda');
  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('link', { name: 'Temas', exact: true })
    .click();
  await page.getByRole('button', { name: 'Nuevo tema' }).click();
  const formulario = dialogo(page);
  for (const [color, valor] of Object.entries({ ...COLORES, Principal: '#1D4ED8', Contraste: '#C8CDD5' }))
    await codigo(page, color).fill(valor);

  const bloqueo = formulario.locator('[data-contraste="bloqueo"]');
  await expect(bloqueo).toContainText(/Texto sobre el fondo principal: \d+\.\d:1, mínimo 4\.5:1/);
  await expect(bloqueo).toContainText('Se ve en los textos y los titulares sobre el fondo principal.');
  await expect(formulario.getByRole('button', { name: 'Guardar tema' })).toBeDisabled();

  await bloqueo
    .getByRole('button', { name: /^Usar #[0-9A-F]{6}$/ })
    .first()
    .click();
  await expect(bloqueo).toHaveCount(0);
  await expect(codigo(page, 'Contraste')).not.toHaveValue('#C8CDD5');
  await expect(formulario.getByRole('button', { name: 'Guardar tema' })).toBeEnabled();
});
