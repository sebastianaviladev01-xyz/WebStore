// Archivo de escenarios de ejemplo para `capturas.mjs` (PBI-0057). Copia este archivo, cámbiale el nombre por el de la
// tarea (se usa como carpeta de salida) y deja solo las rutas que toca el cambio. Cada escenario es una página, con el
// tema que se ve (`a`, `b` o `c`; por omisión, `b`), el rol del Admin con el que se entra y, si hace falta, algo que
// hacer antes (`antes`) o después (`accion`) de abrirla. `capturas.mjs` toma cada uno a los anchos de `anchos`.
import { pulsar, sinGuardar } from '../lib/qa.mjs';

export const escenarios = {
  // Una página de la tienda: no necesita sesión.
  'tienda-inicio-b': { tienda: true, ruta: '/', tema: 'b' },
  'tienda-catalogo-b': { tienda: true, ruta: '/catalogo', tema: 'b' },
  // Una página del Admin, con el rol que indica `rol`: superadmin, admin o vendedor.
  'resumen-superadmin-b': { ruta: '/', rol: 'superadmin', tema: 'b' },
  // Una acción antes de capturar: aquí, abrir el menú del celular (solo a 375 px).
  'tienda-menu-b': {
    tienda: true,
    ruta: '/',
    tema: 'b',
    accion: pulsar('Abrir menú de navegación'),
    soloMovil: true,
  },
  // Un guardado que no debe llegar al BFF: `sinGuardar` lo corta, así los datos no cambian entre tomas.
  'perfil-errores-b': {
    ruta: '/perfil',
    rol: 'superadmin',
    tema: 'b',
    antes: sinGuardar,
    accion: pulsar('Cambiar contraseña'),
  },
};

// Los anchos por omisión son escritorio y móvil; para otros, exporta `anchos`:
// export const anchos = [{ width: 1440, height: 900 }, { width: 375, height: 812 }];
