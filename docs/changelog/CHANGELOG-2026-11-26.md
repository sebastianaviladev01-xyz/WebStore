# Cambios — 2026-11-26: los hallazgos de los lotes 37 y 38, por lotes

Sebastián Avila pidió el 2026-11-25 cerrar todos los pendientes que se pueden resolver en el repositorio: los hallazgos PBI-0256 a PBI-0262. Se cerraron en tres lotes, como excepción al flujo SDD ([ADR-0032](../adrs/0032-cerrar-por-lotes-los-hallazgos-de-los-lotes-37-y-38.md)). Los lotes 40 y 41 se ejecutaron a la vez, cada uno con su rama, su PR y la auditoría de la sesión principal.

- **Registros y sesión del backoffice (lote 40, [PR #101](https://github.com/sebastianaviladev01-xyz/WebStore/pull/101)):**
  - Si falla la consulta al abrir un registro que el panel no tenía (producto, categoría, usuario o banner), el backoffice avisa «No pudimos traer los datos…» con «Reintentar», en lugar de decir que ya no existe (PBI-0256 y PBI-0263).
  - Un fallo de red o del servidor al comprobar la sesión ya no la cierra: el acceso avisa «No pudimos comprobar tu sesión» con «Reintentar». Solo una sesión vencida (401) lleva al acceso como antes (PBI-0257).
- **E2e y herramientas de QA visual (lote 41, [PR #100](https://github.com/sebastianaviladev01-xyz/WebStore/pull/100)):**
  - TEST-18 se reparte en un test por tema y ancho, y dice qué había en pantalla si falla (PBI-0259).
  - El umbral de las capturas se queda en 30, con mediciones que lo justifican (PBI-0260).
  - El escenario del lote 34 restaura el tema activo (PBI-0261).
- **Proceso y cierre (lote 42):**
  - Al cerrar el worktree se conserva el trace de una e2e intermitente (PBI-0258).
  - La convención de commits admite los ámbitos `storefront`, `admin`, `bff` y `qa` (PBI-0262).
  - Los registros, al día, y el cierre de la excepción.

## Verificación

- **Lote 40:**
  - 34 pruebas de arquitectura, 461 del frontend, 755 del BFF y el smoke test, en verde.
  - e2e: 401 de 402. La que falló es una prueba del diálogo de temas, por 0,34 px; repetida cinco veces, pasó todas (PBI-0264).
  - Capturas del estado normal: 20 de 20 iguales.
- **Lote 41:** 34 de arquitectura, 446 del frontend, 755 del BFF y el smoke test, en verde; e2e, 397 de 397.
- **Lote 42, con los lotes 40 y 41 juntos:**
  - 34 de arquitectura, 466 del frontend, 755 del BFF y el smoke test, en verde.
  - e2e: 408 de 408.

## Lo que queda abierto

- **Por confirmar con Daniel:** los avisos de los registros y de la sesión.
- **Por confirmar con Sebastián Avila:** las dos reglas de proceso.
- **Sin priorizar:** PBI-0264, la e2e intermitente.
- **Lo que ya estaba fuera**, con su motivo en el [backlog](../planning/backlog.md) ([cierre de ADR-0032](../adrs/0032-cerrar-por-lotes-los-hallazgos-de-los-lotes-37-y-38.md#cierre)).

## Después del cierre de ADR-0032

- **Reglas de proceso confirmadas:** Sebastián Avila confirmó las dos reglas del lote 42: conservar el trace de una e2e intermitente al cerrar el worktree (PBI-0258) y los ámbitos `storefront`, `admin`, `bff` y `qa` de los commits (PBI-0262).
- **E2e del diálogo de temas (PBI-0264):** la prueba «PBI-0237: a 375 px, el error del nombre no se monta sobre «Colores»» espera a que el diálogo y el error terminen de entrar antes de comparar sus cajas. Medido: al verse el error, el espacio con «Colores» es de 0,8 a 1,9 px y las posiciones aún se mueven; asentado, 4 px. La prueba pasó 10 de 10 con --repeat-each=10.

## Reunión del 2026-11-24 y lotes 43 a 48 (ADR-0033)

- **Registro de la reunión** (PR #104): la daily de Daniel y Sebastián del 2026-11-24 y las capturas del SGC, con PBI-0265 a PBI-0271. Sebastián Avila decidió no dejar nada a la espera de Daniel: las decisiones son suyas y se cambian si Daniel pide otra cosa.
- **Listados y borrado (lote 43, PR #106):** cada listado en un solo panel, con exportación, resumen y paginación de 10, 25 o 50; una ventana propia para confirmar los borrados y cancelar pedidos.
- **Formularios y ruta (lote 44, PR #108):** las páginas de registro como los formularios del SGC y la ruta de navegación en la barra superior.
- **Dashboard (lote 45, PR #107):** filtro de periodo, tarjetas de color, distribución de ventas por categoría y actividad con insignias; todas las cifras son del periodo.
- **Botones del banner (lote 46, PR #109):** cada botón elige «Principal», «Secundario», «Contraste» o «Con borde».
- **Contraste en Temas (lote 47, PR #105):** la revisión explica la relación y sugiere, en cadena, el color que cumple.
- **Cierre (lote 48):** los cinco lotes juntos, con `npm run verify` en verde y e2e 449 de 449 (y 449 de 449 en el CI del #105, sin intermitentes); los registros, al día; ADR-0033 cerrado y sin excepciones vigentes. Quedan sin priorizar PBI-0272 a PBI-0275.
