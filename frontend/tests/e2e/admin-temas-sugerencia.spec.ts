import { expect, test, type Page } from '@playwright/test';

import { cuentasAdmin, desplegarGrupo, ingresarAlAdmin } from './apoyo/entorno';

/**
 * Lote 47 (ADR-0033, PBI-0267): «Revisión de contraste» explica la relación y sugiere un color que cumple. Daniel no
 * entendía «1.4:1» ni «4.5:1»: «tiene que ir con sugerencia», «que sea explicativo, informativo para el usuario». La
 * sugerencia es una por color editable, en cadena, en «Cómo corregirlo»: el color más cercano que hace llegar todos los
 * pares que dependen de él, con los anteriores aplicados. Cada par dice dónde se ve y con qué color se corrige. Las
 * pruebas no guardan.
 */
/** Los colores de B: la base es la de B, así que hereda su escala neutra mientras no cambien el fondo ni el contraste. */
const B = {
  Principal: '#1D4ED8',
  Secundario: '#C2410C',
  'Fondo principal': '#F3F5F8',
  'Fondo secundario': '#FFFFFF',
  Contraste: '#0F172A',
} as const;

const dialogo = (page: Page) => page.getByRole('dialog');
const codigo = (page: Page, color: string) =>
  dialogo(page).getByRole('textbox', { name: `Código hexadecimal de ${color}`, exact: true });

/** Abre «Nuevo tema» y escribe los códigos de los cinco colores. */
async function nuevoTemaCon(page: Page, colores: Record<string, string>): Promise<void> {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await desplegarGrupo(page, 'Tienda');
  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('link', { name: 'Temas', exact: true })
    .click();
  await page.getByRole('button', { name: 'Nuevo tema' }).click();
  await expect(dialogo(page).getByRole('heading', { name: 'Nuevo tema' })).toBeVisible();
  // Material pone el foco en «Nombre» al terminar de abrir el diálogo: si ya se estuviera escribiendo un código, el
  // texto acabaría en el nombre (lote 48, fallo intermitente con un recuento distinto de pares).
  await expect(dialogo(page).getByRole('textbox', { name: 'Nombre' })).toBeFocused();
  for (const [color, valor] of Object.entries(colores)) await codigo(page, color).fill(valor);
}

test('PBI-0267: varios avisos del mismo color dan una sola sugerencia, que los corrige todos', async ({
  page,
}) => {
  await nuevoTemaCon(page, { ...B, Contraste: '#5F6B7A' });
  const formulario = dialogo(page);

  // La explicación está siempre a la vista, una sola vez.
  const revision = formulario.getByRole('region', { name: 'Revisión de contraste' });
  await expect(revision).toContainText('va de 1:1 (iguales) a 21:1 (negro sobre blanco)');
  await expect(revision).toContainText('al menos 4.5:1 para el texto y 3:1 para los bordes y los controles');
  await expect(formulario.getByText(/al menos 4\.5:1 para el texto/)).toHaveCount(1);

  // Ocho pares dependen del contraste, también los del secundario suave: la cadena trae solo «Contraste», sin orden
  // que seguir, y no pide cambiar el secundario.
  const sugerencias = formulario.locator('[data-contraste="sugerencias"]');
  await expect(sugerencias.getByText('Cómo corregirlo', { exact: true })).toBeVisible();
  await expect(sugerencias.getByRole('listitem')).toHaveCount(1);
  await expect(sugerencias).not.toContainText('Aplícalas en este orden');
  await expect(sugerencias).not.toContainText('«Secundario»');
  const contraste = sugerencias.getByRole('listitem').filter({ hasText: '«Contraste»' });
  await expect(contraste).toContainText('Oscurece «Contraste»: hace llegar los 8 pares que dependen de él.');
  await expect(contraste.getByRole('button', { name: /^Usar #[0-9A-F]{6}$/ })).toHaveCount(1);

  // Cada par conserva su cifra, dice dónde se ve y con qué color se corrige, sin botón.
  const aviso = formulario.locator('[data-contraste="aviso"]');
  await expect(aviso).toContainText('Texto secundario sobre el fondo principal: 2.6:1, mínimo 4.5:1');
  await expect(aviso).toContainText('Se ve en el borde de los campos.');
  await expect(aviso.getByText('Se corrige con el color «Contraste».', { exact: true })).toHaveCount(8);
  await expect(aviso.getByRole('button')).toHaveCount(0);

  // Tras aplicarla, no queda nada que corregir.
  const boton = contraste.getByRole('button', { name: /^Usar #[0-9A-F]{6}$/ });
  const sugerido = (await boton.textContent())!.trim().replace('Usar ', '');
  await boton.click();
  await expect(codigo(page, 'Contraste')).toHaveValue(sugerido);
  await expect(codigo(page, 'Contraste')).toBeFocused();
  await expect(aviso).toHaveCount(0);
  await expect(sugerencias).toHaveCount(0);
  await expect(formulario.locator('[data-contraste="correcto"]')).toBeVisible();
});

test('PBI-0267: con varios colores, las sugerencias van en cadena y se aplican en orden', async ({
  page,
}) => {
  // Un fondo secundario gris claro bajo un contraste gris oscuro: primero el fondo secundario, que arregla también dos
  // pares del contraste, y después el contraste, sobre los pares que le quedan.
  await nuevoTemaCon(page, {
    ...B,
    'Fondo principal': '#FFFFFF',
    'Fondo secundario': '#A0A0A0',
    Contraste: '#303030',
  });
  const formulario = dialogo(page);
  const sugerencias = formulario.locator('[data-contraste="sugerencias"]');
  await expect(sugerencias).toContainText('Aplícalas en este orden:');
  const lineas = sugerencias.getByRole('listitem');
  await expect(lineas).toHaveCount(2);
  await expect(lineas.nth(0)).toContainText(
    '1. Aclara «Fondo secundario»: hace llegar los 2 pares que dependen de él y 2 de otros colores.',
  );
  await expect(lineas.nth(1)).toContainText(
    '2. Oscurece «Contraste»: hace llegar los 4 pares que dependen de él.',
  );
  const aviso = formulario.locator('[data-contraste="aviso"]');
  await expect(aviso.getByText('Se corrige con el color «Fondo secundario».', { exact: true })).toHaveCount(
    4,
  );
  await expect(aviso.getByText('Se corrige con el color «Contraste».', { exact: true })).toHaveCount(4);

  // Tras la primera, la segunda pasa a ser la única.
  await lineas
    .nth(0)
    .getByRole('button', { name: /^Usar #[0-9A-F]{6}$/ })
    .click();
  await expect(codigo(page, 'Fondo secundario')).toBeFocused();
  await expect(sugerencias).not.toContainText('Aplícalas en este orden');
  await expect(lineas).toHaveCount(1);
  await expect(lineas.nth(0)).toContainText(
    'Oscurece «Contraste»: hace llegar los 4 pares que dependen de él.',
  );

  await lineas
    .nth(0)
    .getByRole('button', { name: /^Usar #[0-9A-F]{6}$/ })
    .click();
  await expect(sugerencias).toHaveCount(0);
  await expect(formulario.locator('[data-contraste="correcto"]')).toBeVisible();
});

test('PBI-0267: con un solo par, «Usar …» aplica el color sugerido y el aviso desaparece', async ({
  page,
}) => {
  // Con un principal gris medio, el texto de los botones principales queda en 4.4:1; el gris más cercano que llega a
  // 4.5:1 es #767676.
  await nuevoTemaCon(page, { ...B, Principal: '#777777' });
  const formulario = dialogo(page);
  const aviso = formulario.locator('[data-contraste="aviso"]');
  await expect(aviso).toContainText('Texto sobre el color principal: 4.4:1, mínimo 4.5:1');
  await expect(aviso).toContainText('Se ve en el texto de los botones principales.');
  await expect(aviso).toContainText('Se corrige con el color «Principal».');
  const sugerencias = formulario.locator('[data-contraste="sugerencias"]');
  await expect(sugerencias).toContainText('Oscurece «Principal»: hace llegar el par que depende de él.');

  await sugerencias.getByRole('button', { name: 'Usar #767676' }).click();
  await expect(codigo(page, 'Principal')).toHaveValue('#767676');
  await expect(codigo(page, 'Principal')).toBeFocused();
  await expect(formulario.getByLabel('Principal', { exact: true })).toHaveValue('#767676');
  await expect(aviso).toHaveCount(0);
  await expect(sugerencias).toHaveCount(0);
  await expect(formulario.locator('[data-contraste="correcto"]')).toBeVisible();
  await expect(formulario.getByRole('button', { name: 'Guardar tema' })).toBeEnabled();
});

test('PBI-0267: un bloqueo también se corrige con su sugerencia, sin crear otro bloqueo', async ({
  page,
}) => {
  await nuevoTemaCon(page, { ...B, Contraste: '#C8CDD5' });
  const formulario = dialogo(page);
  const bloqueo = formulario.locator('[data-contraste="bloqueo"]');
  await expect(bloqueo).toContainText(/Texto sobre el fondo principal: \d+\.\d:1, mínimo 4\.5:1/);
  await expect(bloqueo).toContainText('Se ve en los textos y los titulares sobre el fondo principal.');
  await expect(bloqueo).toContainText('Se corrige con el color «Contraste».');
  await expect(formulario.getByRole('button', { name: 'Guardar tema' })).toBeDisabled();

  await formulario
    .locator('[data-contraste="sugerencias"]')
    .getByRole('listitem')
    .filter({ hasText: '«Contraste»' })
    .getByRole('button', { name: /^Usar #[0-9A-F]{6}$/ })
    .click();
  await expect(bloqueo).toHaveCount(0);
  await expect(codigo(page, 'Contraste')).not.toHaveValue('#C8CDD5');
  await expect(formulario.getByRole('button', { name: 'Guardar tema' })).toBeEnabled();
});
