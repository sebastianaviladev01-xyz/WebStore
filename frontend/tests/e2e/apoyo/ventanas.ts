import { expect, type Locator } from '@playwright/test';

/**
 * Ventanas del backoffice (`MatDialog`) en las e2e (PBI-0275, hallazgo del lote 48, ADR-0033).
 *
 * Material pone el foco inicial de una ventana (`autoFocus: 'first-tabbable'`) al terminar la animación de apertura,
 * unos 150 ms después del clic. Si la prueba ya está escribiendo o eligiendo en otro campo, lo escrito acaba en el campo
 * enfocado (en el lote 48, el código «0f766e» acabó en el nombre del tema). `abrirVentana` pulsa, espera la ventana y
 * espera ese foco antes de devolverla.
 *
 * Foco inicial medido de cada ventana (el primer control con Tab):
 * - «Nueva marca» y «Editar marca», «Nuevo cliente» y «Editar cliente»: «Nombre» (`campoNombre`);
 * - «Precio para uno o varios distritos» y «Editar tarifa»: «Tienda de origen» (`campoTiendaDeOrigen`);
 * - «Nuevo tema» y «Editar tema»: «Nombre» (`campoNombre`);
 * - las confirmaciones (`apoyo/confirmacion.ts`): «No, cancelar (Esc)» o «No, volver».
 */

/** El campo «Nombre» de una ventana: el primero de las de marcas, clientes y temas. */
export const campoNombre = (ventana: Locator) =>
  ventana.getByRole('textbox', { name: 'Nombre', exact: true });

/** El campo «Tienda de origen» de una ventana de tarifas: el primero. */
export const campoTiendaDeOrigen = (ventana: Locator) =>
  ventana.getByRole('combobox', { name: 'Tienda de origen' });

/**
 * Pulsa `boton`, espera la ventana de nombre `nombre` y su foco inicial: en `foco(ventana)` si se indica (el control
 * que Material enfoca), o en cualquier control de dentro. Devuelve la ventana.
 */
export async function abrirVentana(
  boton: Locator,
  nombre: string | RegExp,
  foco?: (ventana: Locator) => Locator,
): Promise<Locator> {
  await boton.click();
  const ventana = boton.page().getByRole('dialog', { name: nombre });
  await expect(ventana).toBeVisible();
  if (foco) await expect(foco(ventana)).toBeFocused();
  else
    await expect
      .poll(
        () =>
          ventana.evaluate(
            (nodo) => nodo !== document.activeElement && nodo.contains(document.activeElement),
          ),
        { message: `el foco entra en la ventana «${String(nombre)}»` },
      )
      .toBe(true);
  return ventana;
}
