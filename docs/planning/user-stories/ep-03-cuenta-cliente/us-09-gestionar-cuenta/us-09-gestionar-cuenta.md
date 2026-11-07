# US09 — Editar y eliminar la cuenta

- Épica: [EP03 — Cuenta del cliente](../ep-03-cuenta-cliente.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Storefront: cuenta opcional); [TRACEABILITY](../../../TRACEABILITY.md) («Editar/eliminar cuenta»); [contrato del BFF](../../../../../backend/docs/BFF-CONTRACT.md) (PATCH y DELETE /accounts/current)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** cliente con cuenta
- **Quiero** editar mis datos y eliminar mi cuenta
- **Para** mantener mi información al día o dejar de usar la tienda

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Editar los datos

- **Dado** que el cliente inició sesión
- **Cuando** edita sus datos desde su perfil
- **Entonces** el sistema guarda los cambios.

### Escenario 02 – Eliminar la cuenta

- **Dado** que el cliente inició sesión
- **Cuando** elimina su cuenta
- **Entonces** el sistema elimina la cuenta.

## Fuera de alcance y pendientes

- La política de retención y las solicitudes de supresión de datos están pendientes (PBI-0011 del [backlog](../../../backlog.md)).
