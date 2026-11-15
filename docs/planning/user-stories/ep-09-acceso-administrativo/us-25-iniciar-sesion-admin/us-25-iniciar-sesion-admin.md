# US25 — Iniciar sesión en el Admin

- Épica: [EP09 — Acceso administrativo](../ep-09-acceso-administrativo.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [TRACEABILITY](../../../TRACEABILITY.md) («Superadministrador», «Administrador», «Vendedor»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Admin: usuarios administrativos, login y roles aplicados en frontend y BFF); [validación](../../../../../frontend/docs/VALIDATION.md) (cdp-admin-qa)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** usuario administrativo
- **Quiero** iniciar sesión y ver solo los módulos de mi rol
- **Para** trabajar sin riesgo de tocar lo que no me corresponde

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Menú por rol

- **Dado** que un usuario administrativo activo ingresa sus credenciales
- **Cuando** inicia sesión
- **Entonces** el Admin muestra solo los módulos que su rol permite.

### Escenario 02 – Ruta sin permiso

- **Dado** que un usuario abre la URL de un módulo que su rol no permite
- **Cuando** la ruta se carga
- **Entonces** el Admin lo devuelve al inicio, y el BFF rechaza la operación con permiso insuficiente.

### Escenario 03 – Credenciales de prueba

- **Dado** que alguien abre el acceso del Admin
- **Cuando** el BFF no está en modo demo
- **Entonces** el acceso no muestra credenciales de prueba; en modo demo, sí.

### Escenario 04 – Sesión vencida

- **Dado** que la sesión del Admin venció o se cerró mientras el usuario editaba
- **Cuando** el usuario guarda o consulta
- **Entonces** el Admin lo lleva al acceso, que dice «Tu sesión venció. Vuelve a iniciar sesión para continuar.».

> Añadido el 2026-11-14 por el lote 06 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0071 y PBI-0124), sin especificación propia: lo prueba `frontend/tests/e2e/admin-guardado-y-datos.spec.ts`.

### Escenario 05 – Perfil propio

- **Dado** que un usuario del Admin, de cualquiera de los tres roles, abre su perfil
- **Cuando** cambia su nombre o su correo, o su contraseña indicando la actual
- **Entonces** el BFF lo guarda si el correo no es de otro usuario y la contraseña nueva es segura, y al cambiar la contraseña cierra sus demás sesiones.

> Añadido el 2026-11-15 por el lote 07b ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0034; decisión provisional en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueba `frontend/tests/e2e/admin-funciones-nuevas.spec.ts`.
