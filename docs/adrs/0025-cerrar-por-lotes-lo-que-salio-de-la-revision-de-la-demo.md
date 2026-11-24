# 0025. Cerrar por lotes lo que salió de la revisión de la demo, como excepción al flujo

- Estado: Aceptada
- Fecha: 2026-11-24

Decidida por Sebastián Avila el 2026-11-24: «avanzemos rapido e igual que antes cerremos todos los pendientes por lotes al 100% y si choca bueno elije la mejor desicion o solucion y asi para las demas excepto lo de terceros y marca». Es una [excepción](../development/exceptions.md) a [ADR-0002](0002-adoptar-sdd-y-tdd.md) y a [ADR-0016](0016-volver-a-un-pull-request-por-hito.md), con la misma forma que [ADR-0021](0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md).

## Contexto

### Por qué había que decidir

La revisión de la demo que hicieron Daniel y Walther el 2026-11-17 dejó en el [backlog](../planning/backlog.md) PBI-0211 a PBI-0226 (PR #79), con seis filas abiertas en las [decisiones pendientes](../planning/PENDING-DECISIONS.md). Con el flujo vigente, cada grupo sería una feature con seis etapas y un PR por hito. Sebastián Avila pidió cerrarlos ya, por lotes, eligiendo la mejor solución cuando algo choca o no está decidido.

- **Regla y ámbito:** STD-16 y STD-17 y el flujo SDD (etapas, sesiones por etapa, hitos humanos y un PR por hito), en el storefront, el backoffice y el BFF.
- **Riesgo:** sin especificación, plan ni hitos por elemento, una decisión que correspondía a Daniel se implementa antes de que la revise. Se expone el equipo, que recibe PR grandes, y Daniel, que confirma después lo provisional.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Lotes por área, un PR por lote (elegida)** | Como ADR-0021: cada lote es una rama `feature/lote-NN-slug` y un PR, sin documentos SDD por elemento | Rápido y conocido; cada PR es revisable y pasa el CI | Menos puntos de control; PR grandes |
| Esperar a que Daniel resuelva las seis filas abiertas | Construir solo lo que no choca | Nada provisional | Deja pendientes la mayoría de los elementos |
| SDD completo, una feature por área | Seis etapas e hitos por feature | Toda la trazabilidad | No cabe en el plazo |

## Decisión

Cerraremos por lotes PBI-0211 a PBI-0224 y PBI-0226, con las reglas de ADR-0021:

1. **Lotes por área**, cada uno en `feature/lote-NN-slug`, con su worktree y un PR en borrador hacia `dev` que abre la sesión principal después de auditarlo. Los fusiona una persona. Los lotes 21 y 22 parten de `dev` y se ejecutan a la vez; cada lote siguiente parte de `dev` con los anteriores ya fusionados, o de la rama del lote del que depende.
2. **Lo que choca o no está decidido se decide aquí**, con la opción más apegada a lo que dijeron Daniel y Walther o la más conservadora, y queda en las decisiones pendientes como «Provisional, por confirmar con Daniel». Las decisiones de partida están abajo; cada lote puede afinarlas y lo anota en su PR.
3. **Quedan fuera:** lo que depende de terceros (PBI-0002 a PBI-0005, PBI-0007 a PBI-0009, PBI-0011, PBI-0012, PBI-0041, PBI-0058, PBI-0161), lo que depende de una persona o de Daniel (PBI-0043, el modelo de datos base; PBI-0165, la prueba con lector de pantalla; PBI-0225, el cronograma, que necesita las estimaciones de Sebastián con Daniel y Walther), el backend de producción (PBI-0197 y PBI-0198) y la marca del producto (nombre y logo).

**Sigue prohibido** (compensación), como en ADR-0021: saltarse la prueba primero en las áreas de STD-18; cerrar un lote sin `npm run verify` y `npm run test:e2e` en verde; desactivar reglas de ESLint o de Sheriff; cambiar el diseño visual más allá de lo que pide cada elemento, sin capturas (STD-12); cambiar el contrato del BFF sin reflejarlo en [`BFF-CONTRACT.md`](../../backend/docs/BFF-CONTRACT.md) y en el smoke test; que un agente haga push a `dev`, fusione un PR o cree tags; superar Opus 5.5 con `high`; y lo que [`exceptions.md`](../development/exceptions.md) excluye de toda excepción.

Cada commit lleva `Refs:` con sus `PBI-NNNN` y este ADR. Los registros (backlog, decisiones pendientes, trazabilidad, historias e historial) se actualizan en el lote de cierre.

### Lotes

| Lote | Área | Elementos |
|---|---|---|
| 21 | Mantenimientos del backoffice | PBI-0211, 0213, 0216, 0217 |
| 22 | Destacados y categorías | PBI-0215, 0220 |
| 23 | Dashboard, reclamaciones e inventario | PBI-0222, 0223, 0226 |
| 24 | Imágenes y banners | PBI-0214, 0221 |
| 25 | Campos y listado de productos | PBI-0212, 0218, 0219, 0224 |
| 26 | Cierre documental | Los registros de todos los lotes y el cierre de este ADR |

### Decisiones provisionales de partida

- **PBI-0211, mantenimientos:** se aplica la regla de la reunión, que es la más explícita, aunque la respuesta del 2026-11-20 no pidió cambiar las pantallas de registro: más de tres campos, página propia; hasta tres, ventana emergente, para crear y editar. Usuarios (cuatro campos) y Banners pasan a página propia; Marcas, Clientes y Tarifas de envío, a ventana emergente. Los paneles de detalle de Pedidos y Reclamaciones no registran y se quedan como están. La regla se escribe como estándar del backoffice.
- **PBI-0213:** las tarjetas de los roles conservan nombre y descripción, sin el conteo.
- **PBI-0216:** el distrito se elige de una lista; el alta de varios distritos a la vez se conserva como selección múltiple.
- **PBI-0217:** se quita el ajuste porcentual de las tarifas. Daniel y Walther coincidieron en que no aplica, y el precio se cambia tarifa por tarifa.
- **PBI-0215:** el producto tiene una casilla «Es destacado». El inicio muestra los destacados con stock, en carrusel si son más de cuatro; sin ninguno, la sección no sale. Los datos de ejemplo marcan como destacados los cuatro que hoy salen, para que la demo no cambie.
- **PBI-0220:** la lista de Categorías del backoffice se muestra como árbol que se abre por niveles. El registro de la categoría no cambia.
- **PBI-0222:** «Clientes nuevos» pasa a «Clientes web nuevos» y se quita «Pedidos por distrito», que Daniel y Walther llamaron relleno.
- **PBI-0223:** la gestión de reclamaciones se queda como está: el libro de reclamaciones es obligatorio y su gestión ya cubre el plazo legal (PBI-0017) y los avisos de la campana (PBI-0173).
- **PBI-0226:** el stock sale del registro del producto y se gestiona solo en Inventario; un producto nuevo empieza sin stock. El SKU sigue siendo un código por producto: la serie por unidad es parte del modelo de inventario que define Daniel (PBI-0043).
- **PBI-0214:** las imágenes del producto y del banner se cargan como archivo. El backoffice genera la versión reducida, como con la imagen de la categoría (PBI-0176), porque el BFF de prueba no tiene dependencias. Cómo se guardan se registra en un ADR del lote.
- **PBI-0221:** el banner conserva sus campos con nombres y ayudas claras; el tono de la foto se calcula al cargar la imagen, en vez de pedirlo; la vigencia lleva fecha y hora.
- **PBI-0212:** los campos del backoffice usan el contorno del storefront (`ws-outline-fields`).
- **PBI-0218, 0219 y 0224:** precios con dos decimales; el SKU en su propia columna, sin el conteo de características ni de fotos; la ventana «Nuevo tema», más grande.

*Motivo:* Sebastián Avila pidió cerrar todo ya y decidir lo que choca; los lotes conservan lo que protege el resultado (prueba primero, CI, capturas y revisión por PR), como con ADR-0017 y ADR-0021.

## Consecuencias

**Lo que se vuelve más fácil:** presentar cerrados los pendientes de la revisión de la demo.

**Lo que se vuelve más difícil:** PR grandes y decisiones que Daniel puede pedir rehacer, sobre todo PBI-0211 y PBI-0217, que cambian lo que su respuesta del 2026-11-20 dejaba como estaba.

**Vigencia y cierre:**

- Responsable: Sebastián Avila. Termina cuando se fusiona el lote 26 o cuando él la retira.
- Aprobación: Sebastián Avila, 2026-11-24. Falta informar a Daniel Avila.
- Al cerrar, se quita de «Excepciones vigentes» y el flujo de ADR-0016 vuelve a regir sin excepción.
