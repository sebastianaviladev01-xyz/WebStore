// Escenarios del lote 45 (ADR-0033, PBI-0270): el Dashboard con la estructura del panel del SGC (encabezado, filtro
// principal, tarjetas de color sólido, títulos con barra de acento, distribución de ventas por categoría y actividad
// como «Últimos movimientos»), con A, B y C, como superadministrador y como vendedor, a 1440 y 375 px. Las tomas de
// «antes» se hicieron sobre la base del lote (0560429), donde el parámetro `periodo` no existía.
//
// Datos: la copia de las capturas (`backend/data-capturas.json`), creada desde la semilla y preparada con
// `preparar-datos.mjs` y unos pedidos más de otras categorías. Ningún escenario guarda. La fecha del encabezado es la
// del día: las dos tomas se hacen el mismo día.
import { sinGuardar } from '../lib/qa.mjs';

const pagina = (ruta, rol, tema) => ({ ruta, rol, tema, antes: sinGuardar });

export const escenarios = {
  ...Object.fromEntries(
    ['a', 'b', 'c'].flatMap((tema) => [
      [`dashboard-superadmin-${tema}`, pagina('/', 'superadmin', tema)],
      [`dashboard-vendedor-${tema}`, pagina('/', 'vendedor', tema)],
    ]),
  ),
  // Auditoría del lote 45: el gráfico sigue el periodo, por mes con «Año actual» y por hora con «Hoy». Solo «después».
  'dashboard-anio-superadmin-b': pagina('/?periodo=anio', 'superadmin', 'b'),
  'dashboard-hoy-superadmin-b': pagina('/?periodo=hoy', 'superadmin', 'b'),
};
