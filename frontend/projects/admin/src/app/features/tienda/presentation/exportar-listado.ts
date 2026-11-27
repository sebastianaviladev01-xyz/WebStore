import { generarCsv, nombreDeArchivoCsv, TablaExportable } from '../domain/exportacion.rules';

/** Fecha de hoy en Lima, `AAAA-MM-DD`, para el nombre del archivo (las fechas del Admin van en la hora de Lima). */
function hoyEnLima(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * «Exportar» → «CSV (Excel)» (lote 43, ADR-0033, PBI-0265): descarga las filas filtradas de todas las páginas, con las
 * columnas de la tabla, en un CSV que Excel abre con sus tildes (`generarCsv`). No pasa por el BFF: exporta lo que la
 * sesión ya pudo ver.
 */
export function descargarCsv(tabla: TablaExportable, documento: Document): void {
  const archivo = new Blob([generarCsv(tabla)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(archivo);
  const enlace = documento.createElement('a');
  enlace.href = url;
  enlace.download = nombreDeArchivoCsv(tabla.titulo, hoyEnLima());
  enlace.hidden = true;
  documento.body.append(enlace);
  enlace.click();
  enlace.remove();
  // El navegador ya tomó el archivo; se suelta en la siguiente vuelta, no antes.
  setTimeout(() => URL.revokeObjectURL(url));
}

/**
 * «Exportar» → «Imprimir o PDF» (PBI-0265): abre la impresión del navegador con una vista solo de la tabla filtrada
 * completa (todas las páginas), que también se guarda como PDF desde esa ventana. La vista se arma con nodos de texto
 * (sin HTML del usuario) en un `<section class="ws-impresion">` directo del `body`; con `body.ws-imprimiendo`, la hoja
 * de impresión oculta todo lo demás (`styles.css`). Se quita al terminar de imprimir (`afterprint`).
 */
export function imprimirTabla(tabla: TablaExportable, documento: Document): void {
  documento.querySelector('body > .ws-impresion')?.remove();
  const vista = documento.createElement('section');
  vista.className = 'ws-impresion';
  const titulo = documento.createElement('h1');
  titulo.textContent = tabla.titulo;
  const detalle = documento.createElement('p');
  const cantidad = tabla.filas.length;
  detalle.textContent = `${cantidad} ${cantidad === 1 ? 'registro' : 'registros'} · ${hoyEnLima()}`;
  const tablaHtml = documento.createElement('table');
  tablaHtml.setAttribute('aria-label', tabla.titulo);
  const cabecera = tablaHtml.createTHead().insertRow();
  for (const columna of tabla.columnas) {
    const celda = documento.createElement('th');
    celda.scope = 'col';
    celda.textContent = columna;
    cabecera.append(celda);
  }
  const cuerpo = tablaHtml.createTBody();
  for (const fila of tabla.filas) {
    const filaHtml = cuerpo.insertRow();
    for (const valor of fila)
      filaHtml.insertCell().textContent = valor === null || valor === undefined ? '' : String(valor);
  }
  vista.append(titulo, detalle, tablaHtml);
  documento.body.append(vista);
  documento.body.classList.add('ws-imprimiendo');
  const ventana = documento.defaultView;
  const limpiar = () => {
    documento.body.classList.remove('ws-imprimiendo');
    vista.remove();
  };
  ventana?.addEventListener('afterprint', limpiar, { once: true });
  ventana?.print();
}
