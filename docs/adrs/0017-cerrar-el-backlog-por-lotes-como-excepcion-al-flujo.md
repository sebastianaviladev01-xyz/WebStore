# 0017. Cerrar el backlog por lotes, como excepción al flujo

- Estado: Aceptada
- Fecha: 2026-11-14

Decidida por Sebastián Avila el 2026-11-14 («este flujo de trabajo es muy lento, por esta ocasión avancemos lo más rápido posible ya que necesito entregarlo todo lo antes posible, cerrar todos los pendientes»). Es una [excepción](../development/exceptions.md) a [ADR-0002](0002-adoptar-sdd-y-tdd.md) y a [ADR-0016](0016-volver-a-un-pull-request-por-hito.md), limitada al backlog abierto en esa fecha. No sustituye a ninguno de los dos.

## Contexto

### Por qué había que decidir

El 2026-11-14 el [backlog](../planning/backlog.md) tenía 127 elementos abiertos: 59 fallos, 24 deudas técnicas, 34 mejoras y 11 verificaciones pendientes, la mayoría de la auditoría de ese día. Con el flujo vigente, cada uno sería una feature con seis etapas y de cuatro a seis PR. Sebastián Avila necesita entregar todo lo antes posible.

- **Regla y ámbito:** STD-16 y STD-17 y el flujo SDD (etapas, sesiones por etapa, hitos humanos y un PR por hito), en el Storefront, el Admin y el BFF.
- **Riesgo:** sin especificación, plan ni hitos por elemento, una decisión de alcance o de diseño puede quedar sin revisar por una persona antes de implementarse. Se expone el equipo, que recibe cambios más grandes por PR.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Lotes por área, un PR por lote (elegida)** | Los elementos se agrupan por área en lotes; cada lote es una rama `feature/lote-NN-slug` y un PR, sin documentos SDD por elemento | Rápido; cada PR sigue siendo revisable y pasa el CI | Menos puntos de control; PR grandes |
| Una sola rama y un PR | Todo junto | Lo más rápido de publicar | Imposible de revisar; un fallo bloquea todo |
| SDD completo, agrupando elementos por feature | Seis etapas e hitos por grupo | Toda la trazabilidad | Demasiado lento para el plazo |

## Decisión

Cerraremos el backlog abierto el 2026-11-14 por lotes. Sebastián Avila eligió las cuatro respuestas el mismo día:

1. **Lotes por área.** Cada lote va en una rama `feature/lote-NN-slug`, con su worktree y un solo PR hacia `dev`. No se escriben `specification.md`, `planning.md` ni `tasks.md` por elemento.
2. **Decisiones de negocio, provisionales.** Lo que las fuentes no responden se decide con la opción más apegada a las notas de reunión, se implementa y queda en [decisiones pendientes](../planning/PENDING-DECISIONS.md) como «provisional, por confirmar con Daniel».
3. **Lo que depende de terceros queda fuera.** Pasarela, facturación electrónica, correo real, ERP, dominio, revisión legal, modelo de datos base y SSR siguen en el backlog, con lo que falta para desbloquearlos.
4. **Ramas apiladas.** Cada lote parte de la rama del anterior sin esperar su fusión. Los PR se fusionan en orden; los fusiona una persona.

**Sigue prohibido** (compensación):

- Saltarse la prueba primero en las áreas de STD-18: cada corrección de una regla lleva su prueba, escrita antes y vista en rojo.
- Cerrar un lote sin `npm run verify` y `npm run test:e2e` en verde, o desactivar reglas de ESLint o de Sheriff.
- Cambiar el diseño visual más allá de lo que pide cada elemento; un cambio visual se comprueba con capturas (STD-12).
- Cambiar el contrato del BFF sin reflejarlo en [`BFF-CONTRACT.md`](../../backend/docs/BFF-CONTRACT.md) y en el smoke test.
- Que un agente haga push a `dev`, fusione un PR o cree tags, y superar el tope de Opus 5.5 con `high` al delegar.
- Lo que [`exceptions.md`](../development/exceptions.md) excluye de toda excepción.

Cada commit lleva `Refs:` con sus `PBI-NNNN` y este ADR. La sesión principal revisa cada lote (diff, pruebas y capturas) antes de proponer su PR. Al cerrar un elemento, su fila del backlog pasa a `hecha` con el lote y el PR.

### Lotes

| Lote | Área | Elementos |
|---|---|---|
| 01 | Robustez y seguridad del BFF | PBI-0073, 0087 a 0099 (parte del BFF), 0100, 0101 |
| 02 | Pruebas y limpieza del BFF | PBI-0010, 0102, 0103 |
| 03 | Temas y contraste | PBI-0053, 0060 a 0062, 0068, 0069, 0072, 0080, 0084 |
| 04 | Tienda: carrito y checkout | PBI-0040, 0063 a 0065, 0074, 0076, 0086, 0092 y 0096 (parte de la tienda), 0104, 0106, 0107, 0110, 0143 |
| 05 | Tienda: cuenta, catálogo y accesibilidad | PBI-0020, 0024, 0026, 0039, 0046, 0047, 0054, 0075, 0098 (parte de la tienda), 0105, 0108, 0109, 0111 a 0118, 0146 |
| 06 | Admin: guardado y datos | PBI-0023, 0066, 0067, 0070, 0071, 0119 a 0131, 0142, 0145 |
| 07 | Admin: interfaz y permisos | PBI-0013, 0027, 0028, 0033, 0034, 0044, 0052, 0059, 0132, 0139 a 0141, 0148 a 0151, 0153 |
| 08 | Pruebas y deuda del frontend | PBI-0022, 0025, 0029, 0050, 0055 a 0057, 0077 a 0079, 0081, 0082, 0085, 0133, 0134, 0136, 0144, 0154 |
| 09 | Cierre documental | Decisiones provisionales (PBI-0015 a 0019, 0021, 0051, 0083) y elementos externos (PBI-0001 a 0009, 0011, 0012, 0041 a 0043, 0058) |

**Orden de ejecución, por prioridad** (Sebastián Avila, 2026-11-14: «ordénalos por orden de prioridad»): 01, 04, 06, 03, 05, 07, 02, 08 y 09. Va primero lo que puede perder datos, dinero o seguridad, y al final la deuda técnica y los documentos. El número de cada lote no cambia.

El reparto puede ajustarse al ejecutar un lote; el ajuste se anota en su PR. Un hallazgo fuera del alcance de un lote se anota con su PBI y se asigna al lote de su área: PBI-0143, del lote 01, va en el 04; PBI-0144, 0145 y 0146, del lote 04, van en el 08, el 06 y el 05; PBI-0148 a 0151, del lote 06, van en el 07. El lote 06 cambia la forma de guardar del Admin: [ADR-0018](0018-guardar-los-cambios-del-admin-por-registro.md). PBI-0152, del lote 03, va en el 02. PBI-0153, del lote 05, va en el 07. El lote 03 amplía el mapa del tema: [ADR-0019](0019-calcular-con-el-tema-el-error-la-alerta-y-el-texto-sobre-el-principal.md).

*Motivo:* el plazo no admite seis etapas por elemento, y los lotes conservan lo que protege el resultado: prueba primero, CI, capturas y revisión por PR.

## Consecuencias

**Lo que se vuelve más fácil:** cerrar muchos elementos por PR, sin rondas de hito por cada uno.

**Lo que se vuelve más difícil:**

- Los PR son grandes y las ramas apiladas obligan a fusionar en orden; un cambio pedido en un lote se arrastra a los siguientes.
- Las decisiones de alcance y de diseño de cada elemento las toma la sesión principal y se revisan en el PR, no antes.
- Las decisiones provisionales pueden tener que rehacerse cuando Daniel Avila responda.

**Vigencia y cierre:**

- Responsable: Sebastián Avila. Termina cuando se fusiona el último lote o cuando él la retira. No se aplica a elementos anotados después del 2026-11-14 salvo que él lo pida.
- Aprobación: Sebastián Avila, 2026-11-14. Falta informar a Daniel Avila.
- Al cerrar, se quita de «Excepciones vigentes» y el flujo de ADR-0016 vuelve a regir sin excepción. La feature 006 queda cubierta por el lote 07, con sus respuestas provisionales.
