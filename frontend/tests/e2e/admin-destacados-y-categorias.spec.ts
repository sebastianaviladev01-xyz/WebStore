import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  agregarCategorias,
  cambiarCategorias,
  cambiarProductos,
  leerCategorias,
  leerProductos,
} from './apoyo/catalogo';
import { cuentasAdmin, ingresarAlAdmin, urls } from './apoyo/entorno';

/**
 * Lote 22 (ADR-0025; provisional, por confirmar con Daniel).
 *
 * - PBI-0215: el registro del producto tiene la casilla «Es destacado». El inicio de la tienda muestra los destacados
 *   con stock, sin tope; con más de cuatro, en un carrusel con «Destacados anteriores» y «Destacados siguientes», que no
 *   mueve el foco. Sin destacados con stock, la sección no sale.
 * - PBI-0220: la lista de Categorías del Admin es un árbol (`tree`, `treeitem` con `aria-expanded`) que se abre y se
 *   cierra por niveles, con el puntero y con el teclado; una categoría sin hijas es el último nivel.
 */

const seccionDestacados = (page: Page) => page.getByRole('region', { name: 'Productos destacados' });
const carrusel = (page: Page) => seccionDestacados(page).getByRole('region', { name: 'Destacados' });

test.describe('Productos destacados configurables (PBI-0215)', () => {
  test('la casilla «Es destacado» elige los destacados del inicio, en carrusel con más de cuatro', async ({
    page,
  }) => {
    const originales = await leerProductos();
    try {
      // La semilla destaca los cuatro de siempre: sin carrusel.
      await page.goto(`${urls.storefront}/`);
      await expect(
        seccionDestacados(page).getByRole('heading', { name: 'Productos destacados' }),
      ).toBeVisible();
      await expect(carrusel(page)).toHaveCount(0);

      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto(`${urls.admin}/productos/p-005`);
      const formulario = page.getByRole('form', { name: 'Editar producto' });
      const casilla = formulario.getByRole('checkbox', { name: 'Es destacado' });
      await expect(casilla).not.toBeChecked();
      await casilla.check();
      await formulario.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page).toHaveURL(/\/productos$/);
      expect((await leerProductos()).find((producto) => producto.id === 'p-005')?.featured).toBe(true);

      // Cinco destacados con stock: el carrusel muestra los cinco y se mueve sin llevarse el foco.
      await page.goto(`${urls.storefront}/`);
      await expect(carrusel(page).getByRole('group')).toHaveCount(5);
      const anterior = carrusel(page).getByRole('button', { name: 'Destacados anteriores' });
      const siguiente = carrusel(page).getByRole('button', { name: 'Destacados siguientes' });
      await expect(anterior).toHaveAttribute('aria-disabled', 'true');
      await expect(siguiente).toHaveAttribute('aria-disabled', 'false');
      await siguiente.focus();
      await page.keyboard.press('Enter');
      await expect(anterior).toHaveAttribute('aria-disabled', 'false');
      await expect(siguiente).toHaveAttribute('aria-disabled', 'true');
      await expect(siguiente).toBeFocused();
      await expect(carrusel(page).getByText('Productos 2 a 5 de 5')).toBeAttached();

      // Una pestaña de categoría sigue mostrando hasta cuatro de esa categoría, sin carrusel.
      await seccionDestacados(page).getByRole('button', { name: 'Electrohogar' }).click();
      await expect(carrusel(page)).toHaveCount(0);

      // Sin destacados con stock, la sección no sale.
      await cambiarProductos((actuales) => actuales.map((producto) => ({ ...producto, featured: false })));
      await page.reload();
      // Con el catálogo ya cargado (las colecciones por categoría siguen), sin la sección de destacados.
      await expect(page.getByRole('link', { name: 'Explorar tv y audio' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Productos destacados' })).toHaveCount(0);
    } finally {
      await cambiarProductos(() => originales);
    }
  });
});

const arbol = (page: Page) =>
  page
    .getByRole('region', { name: 'Lista de categorías' })
    .getByRole('tree', { name: 'Árbol de categorías' });
const nodo = (page: Page, nombre: string): Locator =>
  arbol(page).getByRole('treeitem', { name: nombre, exact: true });

test.describe('Categorías en árbol (PBI-0220)', () => {
  test('el árbol se abre y se cierra por niveles con el puntero y con el teclado', async ({ page }) => {
    const originales = await leerCategorias();
    try {
      await agregarCategorias([{ id: 'e2e-22-qd', name: 'QD-OLED 22', parentId: 'cat-tv-oled' }]);
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto(`${urls.admin}/categorias`);

      // Cerrado, solo el primer nivel; «Cocina», sin hijas, es el último nivel y no se abre.
      await expect(arbol(page).getByRole('treeitem')).toHaveCount(4);
      await expect(nodo(page, 'TV y audio')).toHaveAttribute('aria-expanded', 'false');
      await expect(nodo(page, 'TV y audio')).toHaveAttribute('aria-level', '1');
      await expect(nodo(page, 'Cocina')).not.toHaveAttribute('aria-expanded');
      await expect(nodo(page, 'TV y audio')).toContainText('Orden: 1 · 1 subcategoría');

      // Con el puntero: abrir «TV y audio» muestra «OLED» en el nivel 2; «Editar» no abre ni cierra.
      await nodo(page, 'TV y audio').getByText('TV y audio').click();
      await expect(nodo(page, 'TV y audio')).toHaveAttribute('aria-expanded', 'true');
      await expect(nodo(page, 'OLED')).toHaveAttribute('aria-level', '2');
      await expect(nodo(page, 'OLED')).toHaveAttribute('aria-expanded', 'false');

      // Con el teclado: ↓ va a «OLED», → la abre, → baja a «QD-OLED 22», ← sube a «OLED», ← la cierra.
      await nodo(page, 'TV y audio').focus();
      await page.keyboard.press('ArrowDown');
      await expect(nodo(page, 'OLED')).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(nodo(page, 'OLED')).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('ArrowRight');
      await expect(nodo(page, 'QD-OLED 22')).toBeFocused();
      await expect(nodo(page, 'QD-OLED 22')).toHaveAttribute('aria-level', '3');
      await page.keyboard.press('ArrowLeft');
      await expect(nodo(page, 'OLED')).toBeFocused();
      await page.keyboard.press('ArrowLeft');
      await expect(nodo(page, 'OLED')).toHaveAttribute('aria-expanded', 'false');
      await expect(nodo(page, 'QD-OLED 22')).toHaveCount(0);

      // Tab desde la fila lleva a sus acciones; las de otras filas no están en el recorrido.
      await page.keyboard.press('Tab');
      await expect(nodo(page, 'OLED').getByRole('link', { name: 'Editar categoría OLED' })).toBeFocused();

      // Al volver de editar, el árbol sigue abierto donde estaba.
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/categorias\/cat-tv-oled$/);
      await page.getByRole('link', { name: 'Regresar', exact: true }).click();
      await expect(nodo(page, 'TV y audio')).toHaveAttribute('aria-expanded', 'true');

      // Inicio y Fin; con la fila de «TV y audio», ← la cierra.
      await nodo(page, 'OLED').focus();
      await page.keyboard.press('End');
      await expect(nodo(page, 'Cocina')).toBeFocused();
      await page.keyboard.press('Home');
      await expect(nodo(page, 'TV y audio')).toBeFocused();
      await page.keyboard.press('ArrowLeft');
      await expect(nodo(page, 'TV y audio')).toHaveAttribute('aria-expanded', 'false');
      await expect(arbol(page).getByRole('treeitem')).toHaveCount(4);
    } finally {
      await cambiarCategorias(() => originales);
    }
  });
});
