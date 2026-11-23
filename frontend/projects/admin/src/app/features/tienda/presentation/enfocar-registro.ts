/**
 * «Agregar» del panel de filtros en los listados que registran en un formulario junto a la lista (Clientes, Usuarios,
 * Banners y Tarifas de envío; lote 11, ADR-0021, PBI-0171): lleva el foco al primer campo del formulario de alta, que
 * en el celular queda debajo de la lista. El navegador lo desplaza a la vista al enfocarlo.
 */
export function enfocarPrimerCampo(formulario: HTMLElement): void {
  formulario
    .querySelector<HTMLElement>(
      'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), mat-select',
    )
    ?.focus();
}
