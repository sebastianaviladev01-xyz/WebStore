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
