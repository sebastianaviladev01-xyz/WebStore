# 001. Reorganizar el Resumen del Admin — Plan

- Feature: `001-reorganizar-resumen-del-admin`
- Especificación: [specification.md](specification.md)
- Estado: aprobado
- Fecha: 2026-11-07
- Hito de arquitectura: aprobado por Sebastián Avila el 2026-11-07, con el gráfico propio (alternativa A)

## Enfoque

Todo se resuelve en el **Admin**, dentro de la feature `tienda`, con los datos del snapshot que ya carga `TiendaFacade`. El BFF, su contrato y el Storefront no cambian.

1. **Reglas puras en `domain/`.** Un único archivo de reglas, `resumen.rules.ts`, calcula los indicadores, la variación, los clientes nuevos, la serie por día, los pedidos por distrito, los últimos pedidos y la distribución por estado. Cada función recibe el instante actual (`ahora`) como parámetro: así las pruebas fijan la fecha y no dependen del reloj. Se escriben con TDD ([STD-18](../../../architecture/standards.md)).
2. **Días en hora de Lima con `Intl`.** La fecha civil de un instante se obtiene con `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' })`, la misma técnica que ya usa el BFF en [`reclamo.rules.mjs`](../../../../backend/src/domain/reclamos/reclamo.rules.mjs) (`addPeruBusinessDays`). Los tramos del mes se comparan como fechas civiles (año, mes y día), sin aritmética de horas.
3. **Presentación.** `ResumenPage` se reorganiza con la estructura de la especificación y llama a las reglas desde señales `computed`. El gráfico es un componente propio de `presentation/` hecho con CSS y los tokens de la paleta B, sin librería de gráficos (alternativa A del [hito](#hito-de-arquitectura)).
4. **Pedidos.** `PedidosPage` recibe el parámetro `pedido` como `input()` gracias a `withComponentInputBinding()`, que ya está activo en [`app.config.ts`](../../../../frontend/projects/admin/src/app/app.config.ts), y lo usa como selección inicial con `linkedSignal`. La plantilla no cambia.

Alternativas descartadas:

| Alternativa | Por qué se descarta |
|---|---|
| Calcular los indicadores en el BFF (ruta nueva o campos nuevos en el snapshot) | Cambia el contrato, que la especificación excluye («Cambios en el BFF y en su contrato»). El snapshot ya trae todos los pedidos |
| Poner los cálculos como `computed` de `TiendaFacade` | La facade es de toda la feature: crecería con lógica que solo usa el Resumen, y esas reglas no se podrían probar con `node:test` sin Angular |
| Crear una feature `resumen/` o una segunda facade | Una feature nueva tendría que depender de `tienda` para leer el snapshot y no aporta límites reales; una segunda facade rompe «una sola facade por feature» ([`frontend/architecture.md` §2.1](../../../../frontend/architecture.md#21-reglas-obligatorias)) |
| Calcular las fechas con `Date#getDate()` (zona del navegador) o restando 5 horas a mano | Con la zona del navegador, un pedido de las 23:30 de Lima cae en otro día si el navegador está en otra zona. Restar 5 horas funciona hoy (Perú no tiene horario de verano), pero duplica lo que `Intl` ya resuelve |

## Responsabilidades por capa

Usa los nombres y convenciones de [`frontend/architecture.md` §4](../../../../frontend/architecture.md#4-componentes-y-convenciones) y de [`backend/architecture.md` §2](../../../../backend/architecture.md#2-convenciones). Todas las rutas son relativas a `frontend/projects/admin/src/app/features/tienda/`.

| Capa | Elemento | Responsabilidad | REQ |
|---|---|---|---|
| Frontend: `domain/` | `resumen.model.ts` (nuevo) | Tipos del Resumen: `FechaLima`, `TramoMes`, `Indicador`, `IndicadoresResumen`, `DiaDelMes`, `PedidosDistrito`, `DistribucionEstados` ([tipos](#tipos-intermedios-y-nombres)) | REQ-01 a REQ-08 |
| Frontend: `domain/` | `resumen.rules.ts` (nuevo) y `resumen.rules.spec.mjs` | Funciones puras: fecha de Lima, tramos de comparación, indicadores con variación, clientes nuevos, serie del mes, distritos con más pedidos, últimos pedidos y distribución por estado | REQ-01, REQ-02, REQ-04, REQ-05, REQ-07, REQ-08, REQ-11 |
| Frontend: `domain/` | `tienda.model.ts` | Recibe `ETIQUETAS_ESTADO_PEDIDO`, que hoy es la constante privada `STATUS_LABELS` de `pedidos.page.ts`, junto a `ETIQUETAS_ESTADO_RECLAMO`. La usan Pedidos y la tabla del Resumen | REQ-07 |
| Frontend: `application/` | `TiendaFacade` | **Sin cambios.** Sigue dando `orders()`, `customers()`, `lowStock()` (5 unidades o menos), `loading()` y `error()` | REQ-01, REQ-06 |
| Frontend: `application/` | `SesionFacade` (feature `sesion`) | **Sin cambios.** `can('orders.manage')` y `can('customers.manage')` deciden qué bloques ve cada rol | REQ-09 |
| Frontend: `data/` | `BffTiendaGateway` | **Sin cambios** | — |
| Frontend: `presentation/` | `ResumenPage` (`resumen.page.ts`, selector `ws-admin-dashboard`, que se conserva) | Compone los bloques en el orden de la especificación, fija `ahora` al crearse la página, llama a las reglas con `computed` y oculta los bloques según el permiso | REQ-01 a REQ-11 |
| Frontend: `presentation/` | `TarjetaIndicadorComponent` (`tarjeta-indicador.component.ts`, selector `ws-admin-tarjeta-indicador`, nuevo) | Tarjeta con título, cifra, variación opcional y enlace «Ver más». Evita repetir cuatro veces el mismo marcado | REQ-01, REQ-02, REQ-03 |
| Frontend: `presentation/` | `GraficoPedidosComponent` (`grafico-pedidos.component.ts`, selector `ws-admin-grafico-pedidos`, nuevo) | Barras por día del mes con una o dos series y leyenda, solo con tokens. Tiene un texto alternativo y una tabla `sr-only` con los valores de cada día ([STD-11](../../../architecture/standards.md)) | REQ-04, REQ-09, REQ-10 |
| Frontend: `presentation/` | `PedidosPage` (`pedidos.page.ts`) | Añade `pedido = input<string>()` y `selectedId = linkedSignal(() => this.pedido() ?? null)`; importa `ETIQUETAS_ESTADO_PEDIDO` del modelo. Ni la plantilla ni los estilos cambian | REQ-07 |
| BFF: todas las capas | — | **Sin cambios.** `buildAdminSnapshot` ([`admin.views.mjs`](../../../../backend/src/application/admin/admin.views.mjs)) ya envía los campos necesarios a cada rol | — |

### Dependencias entre features

Ninguna. `tienda → sesion` ya existe en [`sheriff.config.ts`](../../../../frontend/sheriff.config.ts) y `presentation/` usa `domain/` y `application/` de su propia feature. [`frontend/architecture.md` §2.2](../../../../frontend/architecture.md#22-dependencias-entre-features) no cambia.

## Contrato del BFF afectado

**Ninguno.** El Resumen solo lee `GET /admin/snapshot` ([contrato, Administración](../../../../backend/docs/BFF-CONTRACT.md#administración)), con los campos que ya viajan:

| Método | Ruta | Campos que usa el Resumen | Roles |
|---|---|---|---|
| `GET` | `/admin/snapshot` | `orders[]`: `id`, `createdAt`, `status`, `customer`, `customerEmail`, `district`, `total`; `customers[]` (solo su número); `products[]`: `stock` | `orders` y `customers` según `orders.manage` y `customers.manage`; `products` para los tres roles |

Comprobación: el diff de la rama contra `origin/dev` no toca `backend/` ni `BFF-CONTRACT.md`, y `npm run validate:contract` sigue en verde sin cambios en el smoke test.

## Estado del BFF

| Colección o campo | Regla | Migración (`schemaVersion`) | REQ/ADR |
|---|---|---|---|
| Ninguno | Los clientes siguen sin fecha de alta: el Resumen la deriva del primer pedido (D6) | No | REQ-02, REQ-04 |

## Tipos intermedios y nombres

Código nuevo con nombres de negocio en español ([§4](../../../../frontend/architecture.md#4-componentes-y-convenciones): los nombres en inglés pendientes de migrar no son ejemplo). Los campos del contrato (`createdAt`, `status`, `total`…) siguen en inglés.

| Tipo o nombre | Definición | Tareas que lo usan |
|---|---|---|
| `FechaLima` | `{ anio: number; mes: number; dia: number }`, con `mes` de 1 a 12. Fecha civil en `America/Lima` | Reglas, gráfico |
| `TramoMes` | `{ anio: number; mes: number; desde: number; hasta: number }`: días de un mes, ambos incluidos | Reglas |
| `Indicador` | `{ total: number; variacion: number \| null }`. `variacion` es un % entero; `null` se muestra como «—» | Reglas, tarjetas |
| `IndicadoresResumen` | `{ pedidos: Indicador; ventas: Indicador; clientes: Indicador }` | Reglas, `ResumenPage` |
| `DiaDelMes` | `{ dia: number; pedidos: number; clientesNuevos: number }` | Reglas, gráfico |
| `PedidosDistrito` | `{ distrito: string; pedidos: number }` | Reglas, `ResumenPage` |
| `DistribucionEstados` | `{ completados: number; enProceso: number; otros: number }`, en % enteros | Reglas, `ResumenPage` |
| `fechaEnLima(instante: string \| Date): FechaLima` | Fecha civil de Lima de un instante ISO | Reglas |
| `tramosDeComparacion(hoy: FechaLima): { actual: TramoMes; anterior: TramoMes }` | Actual: día 1 a `hoy.dia`. Anterior: día 1 a `min(hoy.dia, último día del mes anterior)`; en enero, el anterior es diciembre del año anterior | Reglas |
| `variacionPorcentual(actual: number, anterior: number): number \| null` | `Math.round((actual − anterior) / anterior × 100)`; `null` si `anterior` es 0 | Reglas |
| `calcularIndicadores(pedidos, clientes, ahora: Date): IndicadoresResumen` | `pedidos.total` = todos los pedidos; `ventas.total` = suma de `total` sin cancelados, redondeada a céntimos; `clientes.total` = `clientes.length`. Variaciones sobre los tramos, con los mismos criterios; la de clientes cuenta clientes nuevos | Reglas, `ResumenPage` |
| `clientesNuevosPorFecha(pedidos)` (interna, exportada para la prueba) | Fecha de Lima del primer pedido (menor `createdAt`) de cada `customerEmail` normalizado con `trim().toLowerCase()`, como `normalizeEmail` del BFF. Cuenta también los pedidos cancelados | Reglas |
| `serieDelMes(pedidos, ahora: Date): DiaDelMes[]` | Un elemento por día del mes en curso de Lima (28 a 31) | Reglas, gráfico |
| `distritosConMasPedidos(pedidos, limite = 5): PedidosDistrito[]` | Agrupa sin distinguir mayúsculas ni espacios y muestra la primera forma escrita (como `leerDistritos`). Ordena de mayor a menor y, en empate, por nombre con `localeCompare('es-PE')`. Cuenta los cancelados | Reglas, `ResumenPage` |
| `ultimosPedidos(pedidos, limite = 5): Pedido[]` | Ordena por `createdAt` descendente sin depender del orden del arreglo | Reglas, `ResumenPage` |
| `distribucionPorEstado(pedidos): DistribucionEstados` | D8. Porcentajes enteros que suman exactamente 100 con el método del mayor resto (en empate de restos: completados, en proceso, otros). Sin pedidos: 0, 0 y 0 | Reglas, `ResumenPage` |
| `ETIQUETAS_ESTADO_PEDIDO` | `Record<EstadoPedido, string>` con las etiquetas del [glosario](../../../architecture/glosario.md#estado-del-pedido-estadopedido), movida desde `pedidos.page.ts` | Pedidos, `ResumenPage` |
| `pedido` (input de `PedidosPage`) | Valor del parámetro `?pedido=` | Pedidos |

Restricción de la prueba: `resumen.rules.spec.mjs` sigue el patrón de [`tarifa-envio.rules.spec.mjs`](../../../../frontend/projects/admin/src/app/features/tienda/domain/tarifa-envio.rules.spec.mjs), que transpila el `.ts` y **borra sus líneas `import`**. Por eso `resumen.rules.ts` solo importa tipos (`resumen.model.ts`, `tienda.model.ts`) y no valores, y las funciones de fecha viven en el mismo archivo.

## Dependencias y riesgos

| Riesgo o dependencia | Impacto | Mitigación |
|---|---|---|
| Fechas en Lima frente a la zona del navegador o del CI | Un pedido cerca de la medianoche cuenta en el día equivocado | `Intl` con `America/Lima`; casos de borde en TEST-01 (03:00 Z y 05:00 Z del día 1); las reglas reciben `ahora` y no leen el reloj |
| Fin de mes y cambio de año | Variación mal calculada el 29, 30 o 31, en febrero bisiesto o en enero | Casos fijos en TEST-02 |
| Porcentajes redondeados que suman 99 o 101 | Las barras de estado contradicen AC-11 | Mayor resto, probado en TEST-09 |
| Las e2e comparten el estado del BFF y el orden entre proyectos no está garantizado | Una prueba del Resumen que espere 0 pedidos falla si el checkout corrió antes | `admin-resumen.spec.ts` comprueba estructura y roles, no cifras. El estado vacío (AC-13) se cubre con TEST-06, 07 y 09 y con la captura sobre el seed |
| Los servidores de desarrollo del checkout principal ocupan los puertos 3000, 4200 y 4300 | El worktree no puede levantar los suyos para las capturas | El bloque de capturas pide antes a la persona que se detengan los del checkout principal; no se usan puertos alternativos ([varios checkouts](../../../development/local-environment.md#varios-checkouts)) |
| Datos de captura con fechas repartidas | Con pedidos creados hoy, el gráfico tendría una sola barra y la captura no prueba nada | Copia `backend/data-capturas.json` preparada como dice [Capturas antes y después](#capturas-antes-y-después) |
| La tabla de últimos pedidos muestra la fecha con `DatePipe`, en la zona del navegador, como Pedidos | Con un navegador fuera de Lima, la fecha de la tabla y el día del gráfico pueden no coincidir | Se mantiene el criterio actual del Admin (sus personas usuarias están en Lima). Cambiar la zona de todas las fechas del Admin queda fuera del alcance |
| Todos los cálculos se hacen sobre los pedidos del snapshot | Con mucho volumen, el Resumen calcula sobre todos los pedidos en el navegador | Ya ocurre en todo el Admin. Si el volumen crece, se activa [STD-06](../../../architecture/standards.md) en otra feature |
| El presupuesto de estilos por componente es de 8 kB (`anyComponentStyle` en `angular.json`) | El build avisa o falla si el gráfico lleva mucho CSS propio | Tailwind y tokens para el layout. Solo las alturas de las barras van en `[style.height.%]` |

## Decisiones

- **Acordadas** (técnicas, derivadas de la especificación y de la arquitectura vigente):
  - Cálculos en reglas puras de `domain/` de `tienda`, llamadas desde `ResumenPage`; ni facade nueva ni feature nueva.
  - `ahora` se fija una vez al crear la página. Las cifras se actualizan al recargar, como el resto del Admin.
  - Fecha civil con `Intl` y `America/Lima`.
  - Un cliente es nuevo el día de su primer pedido, aunque ese pedido se cancelara. D6 no excluye los cancelados y D7 cuenta los cancelados como pedidos.
  - Distritos agrupados sin distinguir mayúsculas; empate ordenado por nombre.
  - Porcentajes de estado por mayor resto.
  - `?pedido=` como `input()` con `linkedSignal`. La URL no se actualiza al elegir otra fila: sin cambio visual ni de comportamiento.
  - `ETIQUETAS_ESTADO_PEDIDO` pasa a `tienda.model.ts`.
  - Solo los tokens que ya existen: `primary` para «Pedidos», `accent` para «Clientes nuevos», `warning` para el stock bajo. No se añaden tokens.
  - Gráfico propio con CSS y tokens (`GraficoPedidosComponent`), sin librería de gráficos: decisión del [hito de arquitectura](#hito-de-arquitectura) del 2026-11-07.
- **Condicionadas** (qué trabajo bloquean): ninguna.
- **ADR necesarios:** ninguno. No entra ninguna dependencia ni cambia una regla de arquitectura, así que la siguiente etapa es `sdd-tasks`, sin `sdd-decide`.

## Estrategia de pruebas

TDD obligatorio según [STD-18](../../../architecture/standards.md): BFF en `domain/`, `application/` y el contrato de `api/`; frontend en `domain/` de cada feature. Esta feature solo tiene `domain/` en el frontend. Los componentes y las e2e derivan de los AC.

Comando de la prueba concreta, desde `frontend/`: `node --test projects/admin/src/app/features/tienda/domain/resumen.rules.spec.mjs`. Todas las unitarias: `npm test --prefix frontend`.

| ID | Nivel | Qué verifica | AC | TDD obligatorio | Comando |
|---|---|---|---|---|---|
| TEST-01 | Frontend `domain/` | `fechaEnLima`: `2026-11-01T03:00:00Z` es el 31/10 en Lima y `2026-11-01T05:00:00Z` es el 01/11 | AC-04, AC-06 | Sí | `npm test --prefix frontend` |
| TEST-02 | Frontend `domain/` | `tramosDeComparacion`: el 15/11 compara con el 1–15/10; el 31/03 con el 1–28/02; el 31/03/2028 con el 1–29/02 (bisiesto); el 15/01 con el 1–15/12 del año anterior; el 1 del mes compara solo el día 1 | AC-03 | Sí | `npm test --prefix frontend` |
| TEST-03 | Frontend `domain/` | `calcularIndicadores`, totales: pedidos con cancelados; ventas con `total` sin cancelados, redondeadas a céntimos; clientes = número de clientes, incluido uno sin pedidos (`c-1` del seed) | AC-02 | Sí | `npm test --prefix frontend` |
| TEST-04 | Frontend `domain/` | Variación: `(actual − anterior) / anterior × 100` redondeada a entero (subida, bajada e igual); actual 0 con anterior > 0 da −100; anterior 0 da `null`; las ventas del tramo excluyen los cancelados | AC-03, AC-13 | Sí | `npm test --prefix frontend` |
| TEST-05 | Frontend `domain/` | Clientes nuevos: el primer pedido por correo sin distinguir mayúsculas ni espacios marca el día; los pedidos siguientes no cuentan; un cliente sin pedidos no aparece; la variación de clientes usa los clientes nuevos de cada tramo | AC-03, AC-04 | Sí | `npm test --prefix frontend` |
| TEST-06 | Frontend `domain/` | `serieDelMes`: 30 días en noviembre, 28 en febrero de 2026, 29 en febrero de 2028 y 31 en diciembre; cuenta pedidos y clientes nuevos por día de Lima; ignora los pedidos de otros meses; sin pedidos, todo en 0 | AC-06, AC-13 | Sí | `npm test --prefix frontend` |
| TEST-07 | Frontend `domain/` | `distritosConMasPedidos`: los 5 primeros de mayor a menor, con los cancelados; empate por nombre; «miraflores» y «Miraflores» son uno; con menos de 5, los que haya; sin pedidos, lista vacía | AC-07, AC-13 | Sí | `npm test --prefix frontend` |
| TEST-08 | Frontend `domain/` | `ultimosPedidos`: los 5 más recientes por `createdAt`, del más nuevo al más antiguo, aunque el arreglo llegue desordenado; con menos de 5, todos | AC-09 | Sí | `npm test --prefix frontend` |
| TEST-09 | Frontend `domain/` | `distribucionPorEstado`: agrupación D8 con los cinco estados; porcentajes enteros que suman 100 en un caso que con redondeo simple suma 99 (1/1/1) y en uno que sumaría 101; sin pedidos, 0/0/0 | AC-11, AC-13 | Sí | `npm test --prefix frontend` |
| TEST-10 | E2E (caracterización) | Pedidos **antes** de tocarla: sin parámetro, el detalle muestra el pedido más reciente. Se escribe y pasa antes de cambiar `PedidosPage` | AC-10 | No (caracterización obligatoria por la regla de código sin pruebas) | `npm run test:e2e -- storefront-checkout` (desde `frontend/`) |
| TEST-11 | E2E | Desde el Resumen, el pedido recién creado aparece primero en «Últimos pedidos»; «Ver» lleva a `/pedidos?pedido=<id>` con ese pedido en el detalle; `/pedidos?pedido=NO-EXISTE` se comporta como sin parámetro | AC-09, AC-10 | No | `npm run test:e2e -- storefront-checkout` |
| TEST-12 | E2E | `admin-resumen.spec.ts` (nueva). El superadmin ve las cuatro tarjetas en orden con su «Ver más» y su destino; los encabezados del gráfico (con la leyenda «Pedidos» y «Clientes nuevos»), «Pedidos por distrito», «Alertas de inventario», «Últimos pedidos» y «Pedidos por estado». El vendedor no ve «Total de clientes» ni la leyenda «Clientes nuevos», pero sí el resto. Sin cifras que dependan del orden de las specs | AC-01, AC-05, AC-06, AC-07, AC-08, AC-09, AC-11, AC-12 | No | `npm run test:e2e -- admin-resumen` |
| TEST-13 | Comparación de capturas | Resumen y Pedidos antes y después ([tabla](#capturas-antes-y-después)), con la consola sin errores | AC-12, AC-13, AC-14 | No | Panel del navegador o [`frontend/tools/qa/`](../../../../frontend/tools/qa/) |
| TEST-14 | Límites de arquitectura y build | Sheriff y ESLint aceptan las dependencias nuevas de `presentation/` y `domain/` sin reglas desactivadas; el build respeta los presupuestos | — (STD-01, STD-03) | No | `npm run verify` |
| TEST-15 | Contrato del BFF | El contrato no cambia: smoke test en verde sin tocarlo y diff vacío en `backend/` | — (STD-05) | No (no hay cambio de contrato) | `npm run validate:contract` y `git diff --stat origin/dev -- backend/` |

### Pruebas existentes afectadas

| Prueba | Qué puede cambiar: aserciones o solo valores esperados | Cómo se conserva la cobertura |
|---|---|---|
| [`admin-acceso.spec.ts`](../../../../frontend/tests/e2e/admin-acceso.spec.ts) | Nada: comprueba el título y el `h1` «Resumen», que se conservan | Se ejecuta igual; si falla, el Resumen perdió su título |
| [`apoyo/entorno.ts`](../../../../frontend/tests/e2e/apoyo/entorno.ts) (`ingresarAlAdmin`) | Nada: espera el `h1` «Resumen» | Igual |
| [`storefront-checkout.spec.ts`](../../../../frontend/tests/e2e/storefront-checkout.spec.ts) | Solo se **añaden** pasos (TEST-10 y TEST-11) entre el ingreso al Admin y la navegación a Pedidos; las aserciones actuales no se cambian ni se quitan | Sus aserciones actuales siguen tal cual |
| [`tarifa-envio.rules.spec.mjs`](../../../../frontend/projects/admin/src/app/features/tienda/domain/tarifa-envio.rules.spec.mjs) | Nada | — |
| Smoke del contrato (`backend/tests/integration/contrato.smoke.mjs`) | Nada | TEST-15 |

### Capturas antes y después

Pantallas y anchos que se capturan antes y después ([comparar capturas](../../../development/agent-execution.md#comparar-capturas)). Anchos de 1440 y 375 px, porque AC-14 fija 375. Mismo método en las dos tomas: el panel del navegador de la herramienta o los scripts de `frontend/tools/qa/`.

**Datos:**

- `backend/data-capturas.json`, en el worktree, ignorada por git. Se crea desde el seed levantando el BFF con `WEBSTORE_DATA_FILE` (ruta absoluta). Después se registran al menos 8 pedidos con `POST /bff/checkout/orders` (o el checkout del Storefront), con al menos 3 correos distintos (uno con dos pedidos), 4 distritos y los cinco estados, que se asignan desde Pedidos.
- Con el BFF detenido, un script de un solo uso guardado en el directorio temporal de la sesión, no en el repositorio, reparte el `createdAt` de esos pedidos entre el mes en curso y el anterior, con uno a las 23:30 de Lima (04:30 Z del día siguiente).
- `backend/data-vacio.json`: copia recién creada desde el seed, sin pedidos.
- Ninguna copia cambia entre la toma de antes y la de después, y las dos tomas se hacen el mismo día, porque el gráfico depende del mes en curso. El Traspaso de `tasks.md` anota las copias y la fecha.

| Pantalla o ruta | Rol y datos | Anchos | Cambio visual esperado |
|---|---|---|---|
| Admin `/` | `superadmin`, `data-capturas.json` | 1440 y 375 px | Reorganización pedida: AC-01 a AC-11 y AC-14 |
| Admin `/` | `vendedor`, `data-capturas.json` | 1440 y 375 px | Igual que el superadmin, sin la tarjeta ni la serie de clientes (AC-12) |
| Admin `/` | `superadmin`, `data-vacio.json` | 1440 px | Estados vacíos de AC-13; consola sin errores |
| Admin `/pedidos` | `superadmin`, `data-capturas.json` | 1440 y 375 px | Ninguno: «Iguales» |
| Admin `/pedidos?pedido=<id de un pedido que no es el primero>` | `superadmin`, `data-capturas.json` | 1440 px | Solo «después»: la fila y el detalle seleccionados son los del id, con los estilos de hoy |
| Barra lateral y cabecera (en las capturas de `/`) | — | 1440 y 375 px | Ninguno |

### Ejecución prevista

Por paso o tarea prevista, para que `sdd-tasks` no tenga que decidirlo ([tablas de nivel y esfuerzo](../../../development/agent-execution.md#delegar-por-nivel-y-esfuerzo); sin nombres de modelo). El orden respeta TDD: cada TEST antes de su código.

| Paso o tarea | Nivel y esfuerzo sugeridos | E2E | Criterios de aprobación (si es ⚠) |
|---|---|---|---|
| 1. Tipos de `resumen.model.ts`, y TEST-01 y TEST-02 → fecha de Lima y tramos | estándar · alto | No | — |
| 2. TEST-03, TEST-04 y TEST-05 → indicadores, variación y clientes nuevos | estándar · alto | No | — |
| 3. TEST-06 a TEST-09 → serie del mes, distritos, últimos pedidos y estados | estándar · alto | No | — |
| 4. Mover las etiquetas de estado a `ETIQUETAS_ESTADO_PEDIDO`, sin cambio de comportamiento | ligero · medio | No | — |
| 5. TEST-10: caracterizar Pedidos en e2e | estándar · medio | Sí (esa spec) | — |
| 6. Parámetro `?pedido=` en `PedidosPage` y TEST-11 (la parte de Pedidos) | estándar · medio | Sí | — |
| 7. Preparar las copias de datos y tomar las capturas de **antes** | estándar · medio | No | — |
| 8. ⚠ Reorganizar `ResumenPage` con `TarjetaIndicadorComponent` y `GraficoPedidosComponent`, y tomar las capturas de **después** | avanzado · alto | Sí (completo) | Ver abajo |
| 9. TEST-12 (`admin-resumen.spec.ts`) y TEST-11 (la parte del Resumen) | estándar · medio | Sí (completo) | — |
| 10. Documentos afectados | estándar · bajo | No | — |

Bloques sugeridos: pasos 1 a 6 (termina antes del ⚠), paso 7 y ⚠ 8 en la sesión siguiente (la revisión ⚠ se detiene con el paquete), y pasos 9 y 10 al final.

**⚠ Paso 8, criterios de aprobación** (disparador: «Cambio del diseño visual», [revisión adicional](../../../architecture/development-workflow.md#disparadores-de-revisión-adicional)). La persona comprueba en las capturas:

1. Los bloques están en el orden y con los textos de la especificación: cuatro tarjetas («Total de pedidos», «Total de ventas», «Total de clientes», «Stock bajo»), cada una con «Ver más»; gráfico; pedidos por distrito; alertas de inventario; últimos pedidos con «Ver»; pedidos por estado.
2. Las cifras coinciden con los datos de `data-capturas.json` (la evidencia lista los valores esperados de las cuatro tarjetas y de las tres barras de estado).
3. Solo hay tokens existentes, Source Sans 3 y `admin-card`: sin hex sueltos en las plantillas, ni logo, colores, íconos o textos en inglés de OpenCart.
4. A 375 px no hay desborde horizontal de la página; la tabla y el gráfico se desplazan dentro de su contenedor.
5. El vendedor no ve la tarjeta ni la serie de clientes, y ningún bloque aparece vacío o en 0 por falta de permiso.
6. Con `data-vacio.json`: 0 con «—», gráfico sin barras, mensajes de vacío y estados en 0 %.
7. La barra lateral, la cabecera y `/pedidos` salen «Iguales».
8. La consola no tiene errores, y `npm run verify` y el e2e completo están en verde.

## Documentos afectados

- [Glosario](../../../architecture/glosario.md): la fila «Resumen» añade `resumen.rules.ts`; términos nuevos «Total de ventas» (D7), «Cliente nuevo» (D6) y «Variación» (D5), con su nombre en el código.
- [Trazabilidad](../../../planning/TRACEABILITY.md): filas del Resumen reorganizado y del parámetro `?pedido=`, con sus TEST.
- [`frontend/architecture.md` §6](../../../../frontend/architecture.md#6-pruebas): las unitarias de `domain/` incluyen los indicadores del Resumen.
- [Índice de features](../README.md): estado y bloqueos.
- No cambian: el contrato del BFF, `backend/architecture.md`, `sheriff.config.ts`, el [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md) (no hay tokens nuevos) ni los ADR (salvo que el hito elija una librería).

## Hito de arquitectura

Se pide aprobar:

1. Las capas: reglas en `domain/` de `tienda` (`resumen.model.ts` y `resumen.rules.ts`), dos componentes nuevos en `presentation/`, `TiendaFacade` sin cambios, ninguna dependencia nueva entre features.
2. El contrato: sin cambios en el BFF ni en su estado.
3. Las decisiones acordadas de [Decisiones](#decisiones).
4. **La pregunta abierta: gráfico propio o librería de gráficos.**

| Alternativa | Qué significa | Evidencia |
|---|---|---|
| **A. Gráfico propio con CSS y tokens (recomendada)** | `GraficoPedidosComponent` dibuja barras con `div` y alturas en %, con los tokens `primary` y `accent`, leyenda y tabla `sr-only`. Sin dependencia ni ADR. El gráfico sigue al color principal configurable desde Contenido porque usa variables CSS | Solo hace falta un tipo de gráfico (barras por día, sin selector de período ni interacción: alcance de la especificación). `frontend/package.json` no tiene librería de gráficos. [STD-04](../../../architecture/standards.md) exige colores como tokens y [STD-14](../../../architecture/standards.md) favorece pocas dependencias |
| B. Chart.js con `ng2-charts` | Dos dependencias nuevas y un ADR en `sdd-decide`. Dibuja en `canvas`: los colores hay que leerlos de las variables CSS con `getComputedStyle` y la accesibilidad hay que añadirla aparte | Añade peso al bundle inicial o diferido del Admin (presupuesto de `initial`: aviso a 700 kB). Útil si más adelante hay varios tipos de gráfico con tooltips y zoom, que hoy no están en el alcance |
| C. ECharts (`ngx-echarts`) o `@swimlane/ngx-charts` | Lo mismo que B, con librerías más grandes (ECharts) o con su propia hoja de estilos y temas (ngx-charts) | Igual que B; más superficie que mantener y que actualizar con cada versión de Angular |

Recomendación: **A**. Si se aprueba, no hace falta `sdd-decide` y la siguiente etapa es `sdd-tasks`. Si se elige B o C, la siguiente etapa es `sdd-decide`, con el ADR de la librería.

Aprobación: Sebastián Avila aprobó el plan el 2026-11-07 y eligió la alternativa A (gráfico propio con CSS y tokens). Las alternativas B y C quedan descartadas. No hace falta ADR: la siguiente etapa es `sdd-tasks`.
