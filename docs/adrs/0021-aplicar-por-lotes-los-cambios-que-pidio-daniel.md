# 0021. Aplicar por lotes los cambios que pidió Daniel, como excepción al flujo

- Estado: Aceptada
- Fecha: 2026-11-23

Decidida por Sebastián Avila el 2026-11-23 («necesito presentar y cerrar todos los pendientes hoy al 100%, como la vez pasada en esta ocasion avanzemos lo mas rapido posible»). Es una [excepción](../development/exceptions.md) a [ADR-0002](0002-adoptar-sdd-y-tdd.md) y a [ADR-0016](0016-volver-a-un-pull-request-por-hito.md), con la misma forma que [ADR-0017](0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md), limitada a los elementos del backlog que salieron de las respuestas de Daniel Avila. No sustituye a ninguno de los dos.

## Contexto

### Por qué había que decidir

Daniel Avila respondió entre el 2026-11-18 y el 2026-11-20 las 39 preguntas de la página de decisiones, y su registro se fusionó en `dev` el 2026-11-23 (PR #67). De sus respuestas salieron 26 elementos del [backlog](../planning/backlog.md), PBI-0168 a PBI-0193. Con el flujo vigente, cada grupo sería una feature con seis etapas y un PR por hito. Sebastián Avila necesita presentarlos cerrados el mismo día.

- **Regla y ámbito:** STD-16 y STD-17 y el flujo SDD (etapas, sesiones por etapa, hitos humanos y un PR por hito), en el Storefront, el Admin y el BFF.
- **Riesgo:** sin especificación, plan ni hitos por elemento, un detalle que Daniel no dio puede implementarse sin que lo revise una persona antes. Se expone el equipo, que recibe cambios más grandes por PR, y Daniel, que confirma después lo provisional.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Lotes por área, un PR por lote (elegida)** | Los elementos se agrupan por área; cada lote es una rama `feature/lote-NN-slug` y un PR, sin documentos SDD por elemento | Rápido; cada PR sigue siendo revisable y pasa el CI | Menos puntos de control; PR grandes |
| Una sola rama y un PR | Todo junto | Lo más rápido de publicar | Imposible de revisar; un fallo bloquea todo |
| SDD completo, una feature por área | Seis etapas e hitos por feature | Toda la trazabilidad y las preguntas a Daniel antes de construir | No cabe en el plazo |

## Decisión

Aplicaremos por lotes los cambios que pidió Daniel. Sebastián Avila eligió las cuatro respuestas el 2026-11-23:

1. **Lotes por área.** Cada lote va en una rama `feature/lote-NN-slug`, con su worktree y un solo PR hacia `dev`. No se escriben `specification.md`, `planning.md` ni `tasks.md` por elemento. Las ramas se apilan: cada lote parte de la del anterior y los PR se fusionan en orden; los fusiona una persona.
2. **Detalles que Daniel no dio, provisionales.** Se decide la opción más apegada a lo que escribió, o la más conservadora, se implementa y queda en [decisiones pendientes](../planning/PENDING-DECISIONS.md) como «Provisional, por confirmar con Daniel». Las decisiones provisionales de partida están abajo.
3. **PR en borrador sin preguntar.** La sesión principal audita cada lote (diff, pruebas y capturas), publica su rama y abre el PR en borrador. Nunca lo fusiona ni lo marca listo.
4. **Lo que Daniel dejó para después queda fuera.** PBI-0162, PBI-0173 y PBI-0179 siguen en el backlog; PBI-0191 es una pregunta para él; lo que depende de terceros (pasarela, facturación electrónica, correo real, ERP, dominio, revisión legal, modelo de datos base y SSR) sigue como estaba.

**Sigue prohibido** (compensación), como en ADR-0017:

- Saltarse la prueba primero en las áreas de STD-18: cada regla nueva o cambiada lleva su prueba, escrita antes y vista en rojo.
- Cerrar un lote sin `npm run verify` y `npm run test:e2e` en verde, o desactivar reglas de ESLint o de Sheriff.
- Cambiar el diseño visual más allá de lo que pide cada elemento; un cambio visual se comprueba con capturas (STD-12).
- Cambiar el contrato del BFF sin reflejarlo en [`BFF-CONTRACT.md`](../../backend/docs/BFF-CONTRACT.md) y en el smoke test.
- Que un agente haga push a `dev`, fusione un PR o cree tags, y superar el tope de Opus 5.5 con `high` al delegar.
- Lo que [`exceptions.md`](../development/exceptions.md) excluye de toda excepción.

Cada commit lleva `Refs:` con sus `PBI-NNNN` y este ADR. Los registros (backlog, decisiones pendientes, trazabilidad e historial) se actualizan en el lote de cierre, para que las ramas apiladas no choquen en esos archivos.

### Lotes

**Orden de ejecución, por prioridad:** el que Daniel confirmó el 2026-11-20 («el orden de la reunión sigue vigente»: suben catálogo, inventario, banners, dashboard y temas; bajan pedidos, pagos, direcciones y envíos).

| Lote | Área | Elementos |
|---|---|---|
| 11 | Catálogo, inventario y roles | PBI-0170, 0171, 0176 |
| 12 | Banners | PBI-0174, 0184 |
| 13 | Dashboard | PBI-0168, 0172, 0186, 0187 |
| 14 | Temas | PBI-0188, 0189 |
| 15 | Contenido | PBI-0169, 0175, 0182, 0185 |
| 16 | Storefront | PBI-0180, 0181, 0190, 0193 |
| 17 | Entrega, términos y feriados | PBI-0177, 0178, 0183 |
| 18 | Cierre documental | PBI-0192 y los registros de todos los lotes |
| 20 | Hallazgos de los lotes 11 a 17 | PBI-0194 y los hallazgos anotados en los PR de los lotes (añadido al ejecutar el lote 17, como permite el reparto) |

El reparto puede ajustarse al ejecutar un lote; el ajuste se anota en su PR. Un hallazgo fuera del alcance de un lote se anota con su PBI y se asigna al lote de su área.

### Ampliación del 2026-11-23

Ese mismo día, con el lote 11 en marcha, Sebastián Avila pidió cerrar todo, salvo lo que depende de terceros: «no dejar ningun pendiente excepto los terceros», y aplicar «la mejor solucion a cualquier pregunta que surja», sin dejarla pendiente. Eso sustituye el punto 4 de la decisión. Entran también los elementos que Daniel había dejado para más adelante y el resto del backlog que no depende de terceros:

| Lote | Se añade |
|---|---|
| 11 | PBI-0162: la imagen de la categoría también en la lista del Admin y en las vistas de la tienda que listan categorías. Daniel había respondido «no por ahora» |
| 13 | PBI-0173: la campana avisa también de los reclamos y los errores de compra. Daniel lo había dejado para después |
| 16 | PBI-0191: se decide el fondo del buscador enfocado. PBI-0179: el panel lateral de sugeridos, como opción de la configuración de la tienda; por defecto sigue el diálogo, que Daniel dijo que basta |
| 19 (nuevo) | Comparador y direcciones: PBI-0001 (comparador de productos) y PBI-0006 (la configuración de la tienda elige una dirección por pedido o una por producto) |
| 18 | PBI-0015 y PBI-0021 se cierran con las respuestas de Daniel; PBI-0022 se decide con un ADR; PBI-0194 y las preguntas sueltas que siguen abiertas en las decisiones pendientes se cierran como están construidas, como provisionales |

Siguen fuera, por depender de terceros, de Daniel o de una persona: PBI-0002 a PBI-0005, PBI-0007 a PBI-0009, PBI-0011, PBI-0012, PBI-0041, PBI-0043, PBI-0058, PBI-0161, PBI-0165 y el nombre del producto. El lote 19 se ejecuta antes que el 18.

### Decisiones provisionales de partida

Daniel no dio estos detalles. Cada una queda «Provisional, por confirmar con Daniel» y su lote puede afinarla, anotándolo en el PR:

- **PBI-0170:** el vendedor gestiona Inventario y ve Pedidos sin cambiar su estado (Daniel escribió «gestionar Pedidos» solo para el administrador). Sigue sin eliminar productos, como está construido.
- **PBI-0176:** el Admin acepta una foto de hasta 1 MB y el contrato dice que el backend la guarda en una sola versión de 100 × 100 px. El BFF de prueba no tiene dependencias, así que solo hace lo que puede con módulos de Node; lo que no pueda, lo dice su contrato como límite del BFF de prueba.
- **PBI-0184:** cada banner puede llevar hasta dos botones opcionales, uno con la paleta primaria y otro con la secundaria, cada uno con su texto y su enlace.
- **PBI-0188:** la tuerca sale del storefront. En el modo demo, la del backoffice se queda y muestra solo los tres temas predefinidos, como pidió Daniel para «la tuerca de la demo».
- **PBI-0175:** la navegación superior pasa a ser una lista de avisos para los clientes, cada uno con su texto y un enlace opcional.
- **PBI-0177:** los términos tienen un número de versión que sube cada vez que cambia su texto; el pedido guarda la fecha y hora con segundos y la versión aceptada.
- **PBI-0178:** la configuración de la tienda elige la primera fecha de entrega: el mismo día, el día calendario siguiente o el siguiente día hábil, con una hora de corte opcional en hora de Lima. Por defecto, el día calendario siguiente sin hora de corte.
- **PBI-0183:** la pantalla de feriados es del superadministrador, como Contenido; `WEBSTORE_NON_WORKING_DATES` queda como valor inicial.
- **PBI-0190:** el checkout deja de titularse «Finalizar compra», y ese botón queda al final, después de los datos de pago.

*Motivo:* el plazo no admite seis etapas por elemento, y los lotes conservan lo que protege el resultado: prueba primero, CI, capturas y revisión por PR. Funcionó así con ADR-0017.

## Consecuencias

**Lo que se vuelve más fácil:** presentar los cambios de Daniel el mismo día, con un PR revisable por área.

**Lo que se vuelve más difícil:**

- Los PR son grandes y las ramas apiladas obligan a fusionar en orden; un cambio pedido en un lote se arrastra a los siguientes.
- Las decisiones provisionales pueden tener que rehacerse cuando Daniel Avila las revise.

**Vigencia y cierre:**

- Responsable: Sebastián Avila. Termina cuando se fusiona el lote 18 o cuando él la retira. No se aplica a elementos anotados después del 2026-11-23, salvo los hallazgos de estos lotes o que él lo pida.
- Aprobación: Sebastián Avila, 2026-11-23. Falta informar a Daniel Avila.
- Al cerrar, se quita de «Excepciones vigentes» y el flujo de ADR-0016 vuelve a regir sin excepción.

## Cierre

Se ejecutaron diez lotes el 2026-11-23, cada uno con su rama y su PR hacia `dev`, auditado por la sesión principal (diff, `npm run verify` y e2e completo, y capturas cuando tocaba la interfaz). Los fusiona Sebastián Avila:

| Lote | PR |
|---|---|
| 11, catálogo, inventario y roles | [#68](https://github.com/sebastianaviladev01-xyz/WebStore/pull/68) |
| 12, banners | [#69](https://github.com/sebastianaviladev01-xyz/WebStore/pull/69) |
| 13, Dashboard y notificaciones | [#70](https://github.com/sebastianaviladev01-xyz/WebStore/pull/70) |
| 14, temas ([ADR-0022](0022-quitar-la-tuerca-de-la-tienda-y-limitar-la-demo-a-los-temas-predefinidos.md) y [ADR-0023](0023-dar-al-tema-un-borde-del-acento-y-un-acento-fuerte-legible.md)) | [#71](https://github.com/sebastianaviladev01-xyz/WebStore/pull/71) |
| 15, contenido | [#72](https://github.com/sebastianaviladev01-xyz/WebStore/pull/72) |
| 16, storefront | [#73](https://github.com/sebastianaviladev01-xyz/WebStore/pull/73) |
| 17, entrega, términos y feriados | [#74](https://github.com/sebastianaviladev01-xyz/WebStore/pull/74) |
| 19, comparador y direcciones | [#75](https://github.com/sebastianaviladev01-xyz/WebStore/pull/75) |
| 20, hallazgos de los lotes 11 a 17 | [#76](https://github.com/sebastianaviladev01-xyz/WebStore/pull/76) |
| 18, cierre ([ADR-0024](0024-dejar-en-ingles-el-vocabulario-interno-y-el-contrato.md)) | [#77](https://github.com/sebastianaviladev01-xyz/WebStore/pull/77) |

El lote 20 no estaba en el reparto inicial: reunió los hallazgos que anotaron los PR de los lotes 11 a 17, más PBI-0194. Los hallazgos del lote 19 (stock compartido de las e2e, foto grande en el detalle del pedido y el error de la dirección de una línea sin su producto) se corrigieron en el lote 18. Todos tienen su PBI, PBI-0195 a PBI-0210 (PBI-0210, la e2e intermitente de los días no laborables, salió en el CI de este lote), en el [backlog](../planning/backlog.md).

Los registros quedaron al día en el lote 18: el [backlog](../planning/backlog.md), las [decisiones pendientes](../planning/PENDING-DECISIONS.md) (cada respuesta de Daniel dice qué quedó construido, y cada detalle que él no dio dice «Provisional, por confirmar con Daniel»), la [trazabilidad](../planning/TRACEABILITY.md), la [funcionalidad](../planning/FUNCIONALIDAD.md), las [historias de usuario](../planning/user-stories/user-stories.md), el [glosario](../architecture/glosario.md) y el [historial del 2026-11-23](../changelog/CHANGELOG-2026-11-23.md).

**Lo que queda abierto**, con su motivo en la fila de cada elemento del backlog:

- **Terceros o decisiones externas:** pasarela (PBI-0002), facturación electrónica (PBI-0003), multi-tenant (PBI-0004), SSR (PBI-0005), extorno (PBI-0007), correo real (PBI-0008) y lo que depende de él (PBI-0012 y PBI-0161), revisión legal (PBI-0009) y supresión de datos (PBI-0011), ERP de Ecom (PBI-0041) e integraciones (PBI-0058).
- **Daniel:** el modelo de datos base (PBI-0043), el nombre del producto y la revisión de las decisiones provisionales de los lotes 11 a 20.
- **Una persona:** la prueba con lector de pantalla (PBI-0165).
- **El backend de producción:** convertir a 100 × 100 px las imágenes de categoría guardadas antes del lote 11 (PBI-0197) y limitar las peticiones que podrían llenar la lista de errores de compra (PBI-0198).
- **Sebastián Avila y Daniel Avila:** confirmar [ADR-0024](0024-dejar-en-ingles-el-vocabulario-interno-y-el-contrato.md), que dejó en inglés el vocabulario interno y el contrato (PBI-0022) por delegación.

Falta informar a Daniel Avila, como decía la aprobación. La excepción termina al fusionar el PR de este cierre: desde entonces rige [ADR-0016](0016-volver-a-un-pull-request-por-hito.md) sin excepción.

> Nota (2026-11-27): Sebastián Avila confirmó sin esperar a Daniel las decisiones provisionales de los lotes 11 a 20 y [ADR-0024](0024-dejar-en-ingles-el-vocabulario-interno-y-el-contrato.md): se queda lo construido ([decisiones pendientes](../planning/PENDING-DECISIONS.md)).
