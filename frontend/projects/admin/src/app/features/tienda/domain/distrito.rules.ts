import { textoBuscable } from './listado.rules';
import { TarifaEnvio } from './tienda.model';

/**
 * Distritos que se eligen en Tarifas de envío (lote 21, ADR-0025, PBI-0216): los 43 de Lima Metropolitana y los 7 del
 * Callao, con el nombre de uso común (Surco y Cercado de Lima). Confirmado por Sebastián Avila: el BFF no tiene una
 * lista de distritos y sigue aceptando cualquier texto; la tienda ofrece en el checkout los distritos que tienen
 * tarifa.
 */
export const DISTRITOS_DE_LIMA_Y_CALLAO: readonly string[] = [
  'Ancón',
  'Ate',
  'Barranco',
  'Breña',
  'Carabayllo',
  'Cercado de Lima',
  'Chaclacayo',
  'Chorrillos',
  'Cieneguilla',
  'Comas',
  'El Agustino',
  'Independencia',
  'Jesús María',
  'La Molina',
  'La Victoria',
  'Lince',
  'Los Olivos',
  'Lurigancho-Chosica',
  'Lurín',
  'Magdalena del Mar',
  'Miraflores',
  'Pachacámac',
  'Pucusana',
  'Pueblo Libre',
  'Puente Piedra',
  'Punta Hermosa',
  'Punta Negra',
  'Rímac',
  'San Bartolo',
  'San Borja',
  'San Isidro',
  'San Juan de Lurigancho',
  'San Juan de Miraflores',
  'San Luis',
  'San Martín de Porres',
  'San Miguel',
  'Santa Anita',
  'Santa María del Mar',
  'Santa Rosa',
  'Surco',
  'Surquillo',
  'Villa El Salvador',
  'Villa María del Triunfo',
  // Callao
  'Bellavista',
  'Callao',
  'Carmen de la Legua Reynoso',
  'La Perla',
  'La Punta',
  'Mi Perú',
  'Ventanilla',
];

/**
 * Los distritos que se pueden elegir: la lista y los que ya tienen tarifa con otro nombre (para editarlas), sin repetir
 * (sin tildes ni mayúsculas es el mismo distrito, con el nombre de la lista) y en orden alfabético.
 */
export function opcionesDeDistrito(tarifas: readonly TarifaEnvio[]): string[] {
  const unicos = new Map<string, string>();
  for (const distrito of [...DISTRITOS_DE_LIMA_Y_CALLAO, ...tarifas.map((tarifa) => tarifa.destination)]) {
    const clave = textoBuscable(distrito);
    if (clave && !unicos.has(clave)) unicos.set(clave, distrito.trim());
  }
  return [...unicos.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

/** El nombre del distrito tal como está en las opciones (`opcionesDeDistrito`), o el mismo si no está. */
export function distritoDeLasOpciones(opciones: readonly string[], distrito: string): string {
  return opciones.find((opcion) => textoBuscable(opcion) === textoBuscable(distrito)) ?? distrito;
}
