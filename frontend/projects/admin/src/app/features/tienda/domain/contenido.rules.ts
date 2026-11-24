import type { LugarDeSugeridos } from './tienda.model';

/**
 * Listas de Contenido (lote 15, ADR-0021): correos, teléfonos y redes (PBI-0169), avisos de la barra superior
 * (PBI-0175) y accesos inferiores del pie (PBI-0185). Son las reglas del BFF (`domain/admin/contenido.rules.mjs`),
 * que es quien decide; aquí sirven para avisar en el formulario antes de enviar. Cada una devuelve qué hacer, o `null`.
 */

export const MAXIMOS_DE_CONTENIDO = {
  contactEmails: 5,
  contactPhones: 5,
  socialLinks: 8,
  announcements: 5,
  quickLinks: 24,
  etiqueta: 30,
  textoDeAviso: 140,
  textoDeAcceso: 40,
} as const;

/**
 * Dónde muestra la tienda «Producto agregado» con los sugeridos (lote 16, ADR-0021, PBI-0179; provisional). Los valores
 * son los del BFF (`MODOS_DE_SUGERIDOS`); el primero, el diálogo, es el que la tienda usa por defecto.
 */
export const LUGARES_DE_SUGERIDOS: readonly {
  readonly valor: LugarDeSugeridos;
  readonly etiqueta: string;
}[] = [
  { valor: 'dialog', etiqueta: 'En el diálogo' },
  { valor: 'side-panel', etiqueta: 'En un panel lateral' },
];

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO = /^\+?[\d\s().-]+$/;
const esRutaDeLaTienda = (url: string) => /^\/(?!\/)[^\s\\]*$/.test(url);

function esEnlaceHttps(url: string): boolean {
  if (!/^https:\/\//i.test(url) || /\s/.test(url)) return false;
  try {
    return new URL(url).hostname.length > 0;
  } catch {
    return false;
  }
}

export function motivoDeCorreo(valor: string): string | null {
  const correo = valor.trim();
  if (!correo) return 'Escribe el correo o quita esta fila.';
  return CORREO.test(correo) ? null : 'Escribe un correo válido, como nombre@dominio.pe.';
}

export function motivoDeTelefono(valor: string): string | null {
  const telefono = valor.trim();
  if (!telefono) return 'Escribe el teléfono o quita esta fila.';
  const digitos = telefono.replace(/\D/g, '').length;
  return TELEFONO.test(telefono) && digitos >= 6 && digitos <= 15
    ? null
    : 'Usa de 6 a 15 dígitos; se admiten espacios, +, guiones y paréntesis.';
}

export function motivoDeRed(url: string): string | null {
  const direccion = url.trim();
  if (!direccion) return 'Escribe la dirección de la red o quita esta fila.';
  return esEnlaceHttps(direccion) ? null : 'Usa una dirección que empiece con https://.';
}

/** El enlace de un aviso es opcional. */
export function motivoDeEnlaceDeAviso(url: string): string | null {
  const enlace = url.trim();
  return !enlace || esRutaDeLaTienda(enlace) || esEnlaceHttps(enlace)
    ? null
    : 'Usa una ruta de la tienda (/catalogo) o una dirección https://, o déjalo vacío.';
}

/** El destino de un acceso inferior es obligatorio. */
export function motivoDeDestino(url: string): string | null {
  const destino = url.trim();
  return esRutaDeLaTienda(destino) || esEnlaceHttps(destino)
    ? null
    : 'Escribe el destino: una ruta de la tienda (/info/envios) o https://.';
}

/** Como el BFF, los grupos se comparan tal como se escriben (sin espacios en los extremos). */
export function motivoDeGrupos(grupos: readonly string[]): string | null {
  const distintos = [...new Set(grupos.map((grupo) => grupo.trim()).filter(Boolean))];
  if (distintos.length <= 3) return null;
  const lista = `${distintos.slice(0, -1).join(', ')} y ${distintos.at(-1)}`;
  return `El pie admite hasta tres grupos de accesos, además de Productos. Ahora hay ${distintos.length}: ${lista}.`;
}
