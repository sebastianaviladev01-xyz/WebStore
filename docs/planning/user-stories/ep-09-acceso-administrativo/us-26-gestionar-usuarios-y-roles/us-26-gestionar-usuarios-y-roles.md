# US26 — Gestionar usuarios y roles

- Épica: [EP09 — Acceso administrativo](../ep-09-acceso-administrativo.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [TRACEABILITY](../../../TRACEABILITY.md) («Roles fijos (05/11)», «Superadministrador»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Admin: roles); [contrato del BFF](../../../../../backend/docs/BFF-CONTRACT.md) (Roles fijos)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** superadministrador (o administrador, solo con los vendedores)
- **Quiero** crear usuarios administrativos y asignarles uno de los tres roles fijos
- **Para** controlar quién opera la tienda

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Asignar un rol

- **Dado** que el superadministrador está en Usuarios y roles
- **Cuando** crea o edita un usuario y le asigna superadministrador, administrador o vendedor
- **Entonces** el usuario queda con ese rol; los roles no se crean ni se editan.

### Escenario 02 – Último superadministrador

- **Dado** que solo queda un superadministrador activo
- **Cuando** alguien intenta quitarle el rol, desactivarlo o eliminarlo
- **Entonces** el BFF lo impide.

### Escenario 03 – Sobre sí mismo

- **Dado** que un superadministrador edita su propio usuario
- **Cuando** intenta eliminarse, desactivarse o cambiarse el rol
- **Entonces** el BFF lo impide.

### Escenario 04 – Usuario desactivado

- **Dado** que un usuario tiene sesiones abiertas
- **Cuando** el superadministrador lo desactiva o lo elimina
- **Entonces** sus sesiones dejan de ser válidas.

### Escenario 05 – Correo repetido

- **Dado** que ya hay un usuario con un correo (sin contar mayúsculas ni espacios)
- **Cuando** el superadministrador guarda otro usuario con ese correo
- **Entonces** el Admin no lo envía y lo dice en el campo «Correo»; el BFF también lo rechaza.

> Añadido el 2026-11-14 por el lote 06 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0123), sin especificación propia: lo prueba `frontend/tests/e2e/admin-guardado-y-datos.spec.ts`.

### Escenario 06 – El administrador gestiona a los vendedores

- **Dado** que un administrador está en Usuarios y roles
- **Cuando** abre la lista, crea un usuario o edita, activa o desactiva uno
- **Entonces** solo ve a los vendedores, solo puede asignar el rol vendedor y no ve «Eliminar»; si envía al BFF un cambio sobre un superadministrador o un administrador, otro rol o una eliminación, el BFF responde `403 USER_SCOPE_VIOLATION` sin cambiar nada. El superadministrador sigue gestionando a todos y es el único que elimina usuarios.

> Añadido el 2026-11-15 por el lote 07 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0013), con lo que dijo Daniel el 11/11 («gestiona a los usuarios a nivel vendedor»). Que el administrador no elimine vendedores (solo los desactiva) es la opción más conservadora. Daniel lo confirmó el 2026-11-18 ([decisiones pendientes](../../../PENDING-DECISIONS.md), «Permisos de los roles»). Lo prueban `admin-permisos.spec.ts` y `permisos-roles.use-cases.test.mjs`. La lista de usuarios tiene el panel de filtros (PBI-0139).

## Fuera de alcance y pendientes

- Daniel confirmó el 2026-11-18 los permisos de los roles con un cambio en el vendedor, que también gestiona Inventario y ve Pedidos (PBI-0170 del [backlog](../../../backlog.md)), construido en el lote 11 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md)).
- La edición de los datos propios (perfil) se entregó en el lote 07b (PBI-0034) como escenario de [US25](../us-25-iniciar-sesion-admin/us-25-iniciar-sesion-admin.md): no pasa por Usuarios.
