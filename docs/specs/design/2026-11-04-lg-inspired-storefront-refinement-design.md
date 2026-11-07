# Refinamiento premium de WebStore inspirado en LG Perú

## Intención

Elevar el Storefront existente hasta una experiencia de retail premium comparable en jerarquía, ritmo y claridad con LG Perú, conservando la identidad propia de WebStore y toda la funcionalidad aprobada.

La intervención está pensada para una persona que compara productos para el hogar, necesita comprender rápidamente disponibilidad, precio, entrega y siguiente acción, y espera una experiencia confiable tanto en móvil como en escritorio.

## Objetivos

- Consolidar una identidad WebStore reconocible y no genérica.
- Unificar Home, catálogo, PDP, carrito y checkout bajo los mismos tokens y patrones.
- Mejorar jerarquía, legibilidad, estados, navegación y respuesta táctil.
- Mantener Storefront, Admin y Mock BFF sincronizados sin modificar contratos innecesariamente.
- Verificar visualmente los anchos 1440, 1280, 1024, 768, 390 y 360 px.

## No objetivos

- Copiar marca, contenido, fotografías, campañas o iconos propietarios de LG.
- Introducir React, SSR, una pasarela definitiva o nuevas dependencias.
- Añadir comparador, filtros técnicos, atributos o reglas comerciales no aprobadas.
- Rediseñar el Admin salvo que un cambio contractual imprescindible lo requiera.
- Introducir PostgreSQL en esta fase; el Mock BFF sigue siendo la fuente de verdad de la demo.

## Enfoques considerados

1. **Refinamiento sistémico incremental — aprobado.** Preserva arquitectura y comportamiento, mejora tokens y componentes compartidos, y extiende la calidad visual a todo el recorrido de compra. Es el enfoque de menor riesgo y mayor coherencia.
2. **Clon estructural de alta fidelidad.** Requeriría reescritura y acercaría demasiado el producto a una identidad ajena; se descarta.
3. **Retoque cosmético del Home.** Es rápido, pero dejaría catálogo, PDP, carrito y checkout visualmente inconsistentes; se descarta.

## Dirección visual

- **Atmósfera:** galería doméstica contemporánea, sobria y cálida; premium sin teatralidad.
- **Paleta:** hueso mineral y blanco como lienzos, grafito para jerarquía, vino profundo para acción y bronce apagado para acentos comerciales escasos.
- **Tipografía (enmienda de cierre):** Source Sans 3 Variable en toda la experiencia; la escala, el peso y el espaciado crean la jerarquía. Se adopta una sola familia para respetar el acuerdo final del MVP y reducir carga.
- **Profundidad:** cambios de superficie y sombras muy suaves; bordes reservados para controles, separación funcional y foco.
- **Forma:** radios pequeños y medianos por jerarquía; controles circulares solo cuando su función lo justifique.
- **Movimiento:** respuesta a acciones de 120–260 ms, solo `transform` y `opacity` cuando sea posible, con alternativa para movimiento reducido.
- **Firma:** la combinación de panel editorial de producto, fotografía doméstica peruana y acento vino/bronce debe aparecer consistentemente en hero, navegación, cards, beneficios y compra.

## Intervención por superficie

### Shell y navegación

- Afinar proporciones del header, buscador, acciones y navegación secundaria.
- Mantener mega-menú y drawer dinámicos desde categorías/BFF.
- Mejorar estados hover, focus, active y apertura sin añadir ruido visual.

### Home

- Mantener el hero administrable y accesible de máximo tres banners.
- Reforzar el orden hero → categorías → destacados → campañas → beneficios.
- Mejorar jerarquía de pestañas, fichas, precios y CTAs sin inventar promociones.

### Catálogo y PDP

- Sustituir grises y estilos aislados por tokens semánticos.
- Afinar filtros, resultados, estados vacíos y ficha de compra.
- Mantener únicamente filtros por nombre, categoría y precio.

### Carrito y checkout

- Convertirlos en un recorrido continuo con resumen persistente, información fiscal visible y estados consistentes.
- Mantener checkout guest, tarifas BFF y métodos demo existentes.
- Mejorar validación visual y recuperación de errores sin cambiar reglas de negocio.

## Arquitectura y contratos

- Las páginas continúan consumiendo facades/stores; no habrá HTTP directo desde componentes.
- Los endpoints REST existentes permanecen orientados a recursos y mantienen su semántica.
- Los modelos UI no reflejarán tablas de una base de datos futura.
- No existe esquema PostgreSQL en el repositorio; no se inventará uno. Las decisiones futuras deberán conservar PK/FK, `NUMERIC` para dinero, `TIMESTAMPTZ` para eventos e índices guiados por consultas reales.
- Los errores recuperables mostrarán acción clara; los inesperados conservarán contexto en la capa responsable sin filtrar detalles técnicos a usuarios.

## Verificación

- Build Storefront y Admin.
- Typecheck de ambas aplicaciones.
- Validaciones de estructura, BFF y contrato.
- Pruebas de árbol de categorías e interacciones existentes.
- Capturas y medición de overflow en 1440, 1280, 1024, 768, 390 y 360 px.
- Revisión de teclado, foco, estados y `prefers-reduced-motion`.
- Changelog final orientado al usuario.

