# US26 — Gestionar usuarios y roles

- Épica: [EP09 — Acceso administrativo](../ep-09-acceso-administrativo.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [TRACEABILITY](../../../TRACEABILITY.md) («Roles fijos (05/11)», «Superadministrador»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Admin: roles); [contrato del BFF](../../../../../backend/docs/BFF-CONTRACT.md) (Roles fijos)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** superadministrador
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

## Fuera de alcance y pendientes

- Los permisos exactos del vendedor están pendientes de confirmar (PBI-0013 del [backlog](../../../backlog.md)).
