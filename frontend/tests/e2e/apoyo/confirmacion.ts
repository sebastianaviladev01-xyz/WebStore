import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Lote 43 (ADR-0033, PBI-0269): los borrados del backoffice se confirman en una ventana propia, no en el `confirm()` del
 * navegador. La ventana es un `alertdialog` cuyo nombre es su título («Confirmar eliminación» o «Cancelar pedido») y
 * muestra el nombre del registro entre comillas.
 */
export const ventanaDeConfirmacion = (page: Page, titulo = 'Confirmar eliminación'): Locator =>
  page.getByRole('alertdialog', { name: titulo });

/**
 * Responde la ventana de «Confirmar eliminación» que abrió el último clic: comprueba que muestra el nombre del registro
 * y pulsa «Sí, eliminar» (`aceptar`) o «No, cancelar (Esc)». Espera a que la ventana se cierre.
 */
export async function responderEliminacion(page: Page, nombre: string, aceptar: boolean): Promise<void> {
  const ventana = ventanaDeConfirmacion(page);
  await expect(ventana).toBeVisible();
  await expect(ventana).toContainText(`«${nombre}»`);
  await ventana.getByRole('button', { name: aceptar ? 'Sí, eliminar' : 'No, cancelar (Esc)' }).click();
  await expect(ventana).toHaveCount(0);
}

/** Acepta la ventana de «Confirmar eliminación» del registro `nombre`. */
export const aceptarEliminacion = (page: Page, nombre: string): Promise<void> =>
  responderEliminacion(page, nombre, true);
