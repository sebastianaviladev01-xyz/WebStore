/**
 * Composition root del BFF de demostración: lee la configuración, crea el almacén JSON,
 * arma los casos de uso y las rutas, y levanta el servidor HTTP.
 */
import { createServer } from 'node:http';

import { adminRoutes } from './api/routes/admin.routes.mjs';
import { catalogoRoutes } from './api/routes/catalogo.routes.mjs';
import { checkoutRoutes } from './api/routes/checkout.routes.mjs';
import { contenidoRoutes } from './api/routes/contenido.routes.mjs';
import { cuentasRoutes } from './api/routes/cuentas.routes.mjs';
import { enviosRoutes } from './api/routes/envios.routes.mjs';
import { pedidosRoutes } from './api/routes/pedidos.routes.mjs';
import { reclamosRoutes } from './api/routes/reclamos.routes.mjs';
import { saludRoutes } from './api/routes/salud.routes.mjs';
import { temasRoutes } from './api/routes/temas.routes.mjs';
import { visitasRoutes } from './api/routes/visitas.routes.mjs';
import { createRequestHandler } from './api/router.mjs';
import { createAdminSesionesUseCases } from './application/admin/admin-sesiones.use-cases.mjs';
import { createNotificacionesUseCases } from './application/admin/notificaciones.use-cases.mjs';
import { createPerfilUseCases } from './application/admin/perfil.use-cases.mjs';
import { createSnapshotUseCases } from './application/admin/snapshot.use-cases.mjs';
import { createCatalogoQueries } from './application/catalogo/catalogo.queries.mjs';
import { createCheckoutUseCases } from './application/checkout/checkout.use-cases.mjs';
import { createContenidoQueries } from './application/contenido/contenido.queries.mjs';
import { createCuentasUseCases } from './application/cuentas/cuentas.use-cases.mjs';
import { createEnviosQueries } from './application/envios/envios.queries.mjs';
import { createPedidosUseCases } from './application/pedidos/pedidos.use-cases.mjs';
import { createReclamosUseCases } from './application/reclamos/reclamos.use-cases.mjs';
import { createTemasQueries } from './application/temas/temas.queries.mjs';
import { createTemasUseCases } from './application/temas/temas.use-cases.mjs';
import { createVisitasUseCases } from './application/visitas/visitas.use-cases.mjs';
import { crearVigiaDeFeriados, readConfig } from './infrastructure/config.mjs';
import { limaDate } from './domain/comun/reloj.mjs';
import { createJsonStateStore } from './infrastructure/persistencia/json-state-store.mjs';
import { hashPassword, passwordMatches } from './infrastructure/seguridad/password-hasher.mjs';
import { createCode, createToken, digest, newId } from './infrastructure/seguridad/tokens.mjs';

const config = readConfig(process.env);
// PBI-0010 y PBI-0163: la lista de feriados se renueva cada año; si falta el año en curso, el log lo dice al
// arrancar y otra vez cuando cambia el año de Lima con el BFF en marcha.
const vigiaDeFeriados = crearVigiaDeFeriados({
  nonWorkingDates: config.nonWorkingDates,
  hoy: () => limaDate(),
  avisar: (aviso) => console.warn(aviso),
});
vigiaDeFeriados.comprobar();
vigiaDeFeriados.iniciar();
let store;
try {
  store = createJsonStateStore({ dataFile: config.dataFile, demoPasswords: config.demoPasswords });
} catch (error) {
  // Un archivo de datos dañado no se reemplaza por la demo (PBI-0088): el BFF no arranca y dice por qué.
  console.error(error.message);
  process.exit(1);
}
const security = { hashPassword, passwordMatches, digest, createCode, createToken, newId };

const cuentas = createCuentasUseCases({ store, security, exposeTestCodes: config.exposeTestCodes });
const adminSesiones = createAdminSesionesUseCases({ store, security });
// Latidos de la tienda, solo en memoria (PBI-0027).
const visitas = createVisitasUseCases();

// El orden importa: la primera ruta que coincide responde (como el router original).
const routes = [
  ...saludRoutes(),
  ...cuentasRoutes(cuentas),
  ...catalogoRoutes(createCatalogoQueries({ store })),
  ...contenidoRoutes(createContenidoQueries({ store })),
  ...enviosRoutes(createEnviosQueries({ store })),
  ...reclamosRoutes(createReclamosUseCases({ store, nonWorkingDates: config.nonWorkingDates })),
  ...checkoutRoutes(createCheckoutUseCases({ store, security })),
  ...pedidosRoutes(createPedidosUseCases({ store, security })),
  ...visitasRoutes(visitas),
  ...adminRoutes(
    adminSesiones,
    createSnapshotUseCases({
      store,
      security,
      resetEnabled: config.allowStoreReset,
      personasEnLinea: visitas.enLinea,
    }),
    createPerfilUseCases({ store, security, adminSesiones }),
    createNotificacionesUseCases({ store }),
  ),
  ...temasRoutes({
    consultas: createTemasQueries({ store }),
    casosDeUso: createTemasUseCases({ store, security }),
    adminSesiones,
    modoDemo: config.demoMode,
  }),
];

const server = createServer(createRequestHandler({ routes, allowedOrigins: config.allowedOrigins }));
server.listen(config.port, () => console.log(`WebStore Mock BFF http://localhost:${config.port}`));
