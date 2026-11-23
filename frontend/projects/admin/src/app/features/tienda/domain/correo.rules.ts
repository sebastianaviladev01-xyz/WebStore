/**
 * Correo comparable: sin espacios en los extremos y en minúsculas, como `normalizeEmail` del BFF. Lo usan el
 * Dashboard (clientes nuevos por correo) y el registro de usuarios (correo repetido): una sola copia (PBI-0080).
 */
export const normalizarCorreo = (correo: string): string => correo.trim().toLowerCase();
