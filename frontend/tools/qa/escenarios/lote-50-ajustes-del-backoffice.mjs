// Escenarios del lote 50 (ADR-0037): los ajustes del backoffice.
// - PBI-0276: el pie de Usuarios, sin las fichas por rol.
// - PBI-0288: «Distribución de ventas por categoría» del Dashboard, un color por barra, con A, B y C.
// - PBI-0289: Contenido, con el logo cargado (la ayuda de «Cargar logo» cambia), y la tienda con ese logo, que antes
//   llegaba como Data URL y después como dirección del BFF: la cabecera debe verse igual.
//
// Datos: la copia de las capturas (`backend/data-capturas.json`), creada desde la semilla y preparada con cuatro
// categorías más, sus productos, siete pedidos de invitado de siete categorías (seis con nombre y «Otras») y un logo PNG
// de 64 × 64 px cargado como Data URL. Ningún escenario guarda. Las dos tomas se hacen el mismo día.
import { sinGuardar } from '../lib/qa.mjs';

const pagina = (ruta, tema = 'b') => ({ ruta, rol: 'superadmin', tema, antes: sinGuardar });

export const escenarios = {
  'usuarios-superadmin-b': pagina('/usuarios'),
  ...Object.fromEntries(['a', 'b', 'c'].map((tema) => [`dashboard-superadmin-${tema}`, pagina('/', tema)])),
  'contenido-superadmin-b': pagina('/contenido'),
  'tienda-inicio-b': { tienda: true, ruta: '/', tema: 'b', desplazamientos: [0] },
};
