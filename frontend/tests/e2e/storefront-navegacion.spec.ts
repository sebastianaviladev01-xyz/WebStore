import { expect, test } from '@playwright/test';

/**
 * Navegación del Storefront: cada ruta pública carga con su título y encabezado, el inicio anterior sigue
 * publicado fuera del menú y una ruta desconocida muestra la página 404.
 */
const rutas = [
  { ruta: '/', titulo: 'WebStore | Inicio', encabezado: 'El cine, en tu sala.' },
  { ruta: '/catalogo', titulo: 'WebStore | Productos', encabezado: 'Todos los productos' },
  { ruta: '/carrito', titulo: 'WebStore | Carrito', encabezado: 'Carrito' },
  // Lote 16 (PBI-0190): la ruta no cambia; el título y el encabezado dicen «Datos de tu compra», y «Finalizar
  // compra» queda solo para el botón del final.
  { ruta: '/checkout', titulo: 'WebStore | Datos de tu compra', encabezado: 'Datos de tu compra' },
  { ruta: '/pedidos', titulo: 'WebStore | Mis pedidos', encabezado: 'Mis pedidos' },
  { ruta: '/cuenta/login', titulo: 'WebStore | Iniciar sesión', encabezado: 'Iniciar sesión' },
  { ruta: '/cuenta/registro', titulo: 'WebStore | Registro', encabezado: 'Crear cuenta' },
  { ruta: '/info/contacto', titulo: 'WebStore | Contacto', encabezado: 'Contacto' },
  { ruta: '/info/envios', titulo: 'WebStore | Envíos', encabezado: 'Envíos' },
  { ruta: '/info/privacidad', titulo: 'WebStore | Privacidad', encabezado: 'Política de privacidad' },
  { ruta: '/info/terminos', titulo: 'WebStore | Términos', encabezado: 'Términos y condiciones' },
  {
    ruta: '/libro-reclamaciones',
    titulo: 'WebStore | Libro de reclamaciones',
    encabezado: 'Libro de reclamaciones',
  },
];

for (const { ruta, titulo, encabezado } of rutas) {
  test(`la ruta ${ruta} carga con su título y encabezado`, async ({ page }) => {
    await page.goto(ruta);
    await expect(page).toHaveTitle(titulo);
    await expect(page.getByRole('heading', { level: 1, name: encabezado })).toBeVisible();
  });
}

test('PBI-0193: /inicio-anterior ya no existe y muestra la página 404 (lote 16, ADR-0021)', async ({
  page,
}) => {
  await page.goto('/inicio-anterior');
  await expect(page).toHaveTitle('WebStore | Página no encontrada');
  await expect(page.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeVisible();
  await expect(page.locator('a[href="/inicio-anterior"]')).toHaveCount(0);
});

test('una ruta desconocida muestra la página 404 con enlace al inicio (PBI-0020)', async ({ page }) => {
  await page.goto('/no-existe');
  await expect(page).toHaveTitle('WebStore | Página no encontrada');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página no encontrada');
  await page.getByRole('link', { name: 'Ir al inicio' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1, name: 'El cine, en tu sala.' })).toBeVisible();
});

test('la cabecera y el pie llevan a las secciones principales', async ({ page }) => {
  await page.goto('/');
  const cabecera = page.getByRole('banner');
  await cabecera.getByRole('link', { name: 'Carrito' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Carrito' })).toBeVisible();

  await cabecera.getByRole('link', { name: 'Ingresar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Categorías principales' })
    .getByRole('link', { name: 'Todas las categorías' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Todos los productos' })).toBeVisible();

  await page.getByRole('contentinfo').getByRole('link', { name: 'Libro de reclamaciones' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Libro de reclamaciones' })).toBeVisible();

  await page.getByRole('link', { name: 'Ir al inicio' }).first().click();
  await expect(page).toHaveURL('/');
});
