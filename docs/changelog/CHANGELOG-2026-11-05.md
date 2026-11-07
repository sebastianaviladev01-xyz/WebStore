# Cierre de cumplimiento — 2026-11-05

## Seguridad y cuentas

- Registro, verificación, login, perfil, recuperación y eliminación conectados al BFF.
- Contraseñas con `scrypt` y sal, códigos temporales generados criptográficamente y tokens opacos revocables.
- Login Admin real para Owner y Catálogo; autorización repetida en servidor y navegación según rol.

## Operación

- Libro de reclamaciones persistente con código de recepción, fecha de atención y bandeja administrativa.
- Contenido editable de Contacto, Envíos, Privacidad y Términos.
- Productos con miniatura y características reales administrables.
- Estado de carga/error y rollback optimista en operaciones del Admin.

## Diseño y experiencia

- Sistema borgoña premium alineado entre Storefront y Admin.
- Source Sans 3 como única familia para respetar el acuerdo del MVP.
- Miniaturas de producto de 480 px y prioridad correcta para el LCP.
- Movimiento CSS contenido, responsive sin overflow y respeto de movimiento reducido.

## Verificación

- Contrato BFF, tipos, builds y pruebas de categorías en verde.
- Flujos de Storefront y Admin ejercitados en Chrome por CDP.
- Consola limpia y detector de Impeccable sin hallazgos DOM.
- Evidencia responsive final en `output/visual-qa/compliance-final/`.
