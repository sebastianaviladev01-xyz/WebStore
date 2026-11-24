/**
 * «Entregas y feriados» del superadministrador (lote 17, ADR-0021; provisional, por confirmar con Daniel). El BFF
 * decide: la primera fecha de entrega (PBI-0178, `backend/src/domain/pedidos/primera-fecha-de-entrega.rules.mjs`) y
 * los días no laborables (PBI-0183, `backend/src/domain/calendario/dias-no-laborables.rules.mjs`). Estas reglas repiten
 * lo que hace falta para avisar antes de enviar y explicar la regla elegida; la prueba las compara con las del BFF.
 */
import { DiaNoLaborable, ModoDeDireccion, ReglaDePrimeraEntrega } from './tienda.model';

/** Las reglas que puede elegir la tienda, con la de por defecto primero. */
export const REGLAS_DE_PRIMERA_ENTREGA: readonly {
  readonly valor: ReglaDePrimeraEntrega;
  readonly etiqueta: string;
}[] = [
  { valor: 'next-calendar-day', etiqueta: 'El día calendario siguiente' },
  { valor: 'next-business-day', etiqueta: 'El siguiente día hábil' },
  { valor: 'same-day', etiqueta: 'El mismo día' },
];

/**
 * Una dirección por pedido o una por producto (lote 19, ADR-0021, PBI-0006; provisional, por confirmar con Daniel), con
 * la de por defecto primero. El BFF decide (`backend/src/domain/pedidos/direcciones-por-producto.rules.mjs`).
 */
export const MODOS_DE_DIRECCION: readonly {
  readonly valor: ModoDeDireccion;
  readonly etiqueta: string;
  readonly explicacion: string;
}[] = [
  {
    valor: 'per-order',
    etiqueta: 'Una dirección por pedido',
    explicacion: 'Todo el pedido se entrega en la dirección que indica el comprador.',
  },
  {
    valor: 'per-product',
    etiqueta: 'Una dirección por producto',
    explicacion:
      'El comprador puede enviar cada producto a otra dirección. El envío se cobra una vez por cada dirección distinta.',
  },
];

/** Largo máximo del nombre de un día no laborable, el del BFF. */
export const MAXIMO_NOMBRE_DE_DIA_NO_LABORABLE = 60;

/** Hora de corte: vacía o `HH:MM` de 24 horas. */
export const esHoraDeCorte = (valor: string): boolean =>
  valor === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);

/** El minuto anterior a la hora de corte (`14:00` → `13:59`), para decir hasta cuándo vale la primera fecha. */
function minutoAnterior(hora: string): string {
  const [horas, minutos] = hora.split(':').map(Number);
  const total = horas * 60 + minutos - 1;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const SIN_CORTE: Readonly<Record<ReglaDePrimeraEntrega, string>> = {
  'same-day': 'El comprador puede elegir desde el mismo día del pedido.',
  'next-calendar-day':
    'El comprador puede elegir desde el día siguiente al pedido, aunque sea sábado, domingo o feriado.',
  'next-business-day':
    'El comprador puede elegir desde el siguiente día hábil: sin sábados, domingos ni días no laborables.',
};

/** Desde cuándo elige el comprador con la regla y la hora de corte, en una frase para el formulario. */
export function explicacionDeLaRegla(regla: ReglaDePrimeraEntrega, corte: string): string {
  if (!corte || !esHoraDeCorte(corte)) return SIN_CORTE[regla];
  const despues: Readonly<Record<ReglaDePrimeraEntrega, string>> = {
    'same-day': 'desde el día siguiente',
    'next-calendar-day': 'desde dos días después',
    'next-business-day': 'un día hábil después',
  };
  const habil =
    regla === 'next-business-day'
      ? ' Los sábados, domingos y días no laborables cuentan como el día hábil siguiente.'
      : '';
  if (corte === '00:00') return `Desde las 00:00, todo el día: ${despues[regla]}.${habil}`;
  const antes: Readonly<Record<ReglaDePrimeraEntrega, string>> = {
    'same-day': `Pedidos hasta las ${minutoAnterior(corte)}: desde el mismo día.`,
    'next-calendar-day': `Pedidos hasta las ${minutoAnterior(corte)}: desde el día siguiente.`,
    'next-business-day': `Pedidos de un día hábil hasta las ${minutoAnterior(corte)}: desde el siguiente día hábil.`,
  };
  return `${antes[regla]} Desde las ${corte}: ${despues[regla]}.${habil}`;
}

const anioDe = (fecha: string) => fecha.slice(0, 4);

/** Años del filtro: los que tienen días en el calendario, el actual y el siguiente, en orden. */
export function aniosDelCalendario(dias: readonly DiaNoLaborable[], anioActual: string): string[] {
  const siguiente = String(Number(anioActual) + 1);
  return [...new Set([...dias.map((dia) => anioDe(dia.date)), anioActual, siguiente])].sort();
}

/** Los días de un año, por fecha. */
export function diasDelAnio(dias: readonly DiaNoLaborable[], anio: string): DiaNoLaborable[] {
  return dias.filter((dia) => anioDe(dia.date) === anio).sort((a, b) => a.date.localeCompare(b.date));
}

const DIAS_DE_LA_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** El día de la semana de una fecha `AAAA-MM-DD`, sin pasar por la zona del navegador. */
export function diaDeLaSemana(fecha: string): string {
  return DIAS_DE_LA_SEMANA[new Date(`${fecha}T12:00:00Z`).getUTCDay()];
}

const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function existe(fecha: string): boolean {
  const partes = FECHA_ISO.exec(fecha);
  if (!partes) return false;
  const [anio, mes, dia] = partes.slice(1).map(Number);
  const valor = new Date(Date.UTC(anio, mes - 1, dia));
  return valor.getUTCFullYear() === anio && valor.getUTCMonth() === mes - 1 && valor.getUTCDate() === dia;
}

/** Por qué no se puede agregar el día (fecha vacía, que no existe o repetida, o un nombre largo), o `null`. */
export function motivoParaNoAgregarDia(
  dias: readonly DiaNoLaborable[],
  fecha: string,
  nombre: string,
): string | null {
  if (!fecha) return 'Elige una fecha.';
  if (!existe(fecha)) return 'Elige una fecha válida.';
  if (dias.some((dia) => dia.date === fecha))
    return `El ${fecha.split('-').reverse().join('/')} ya está en el calendario.`;
  if (nombre.trim().length > MAXIMO_NOMBRE_DE_DIA_NO_LABORABLE)
    return `El nombre admite hasta ${MAXIMO_NOMBRE_DE_DIA_NO_LABORABLE} caracteres.`;
  return null;
}
