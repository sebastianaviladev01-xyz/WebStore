/**
 * Cambio de un registro del Admin (lote 06, ADR-0017; PBI-0119, PBI-0120, PBI-0121, PBI-0122 y PBI-0142). El
 * Admin no reenvía colecciones enteras: envía al BFF solo el registro y los campos que cambió la persona
 * (`{ upsert: [cambio] }`), y el BFF conserva lo demás. Antes de enviarlo sobre los datos vigentes (también al
 * reintentar tras `409 STALE_SNAPSHOT`) se comprueba que el registro sigue existiendo y que nadie cambió esos mismos
 * campos mientras tanto; si no, no se guarda y se avisa.
 */

/** Un campo que la persona vació llega como `null`: el BFF lo quita del registro. */
type Campos = Record<string, unknown>;

export type ResultadoCambio =
  | { readonly tipo: 'listo'; readonly cambio: Campos }
  | { readonly tipo: 'sin-cambios' }
  | { readonly tipo: 'inexistente' }
  | { readonly tipo: 'ya-existe' }
  | { readonly tipo: 'conflicto'; readonly campos: readonly string[] };

const iguales = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Campos de `editado` distintos de los de `base`; las listas y los objetos se comparan por contenido. */
export function camposCambiados<T extends object>(base: T, editado: T): Campos {
  const antes = base as Campos;
  const despues = editado as Campos;
  const cambios: Campos = {};
  for (const clave of new Set([...Object.keys(antes), ...Object.keys(despues)])) {
    if (!iguales(antes[clave], despues[clave])) cambios[clave] = despues[clave] ?? null;
  }
  return cambios;
}

/** Registro completo sin los campos vacíos (`undefined`), para agregarlo. */
const sinVacios = (registro: object): Campos =>
  Object.fromEntries(Object.entries(registro).filter(([, valor]) => valor !== undefined));

/**
 * Prepara el cambio sobre el registro `vigente` (el de los datos con que se guarda). `base` es el registro tal como
 * lo vio la persona al empezar a editar (`null` si es nuevo) y `editado`, como quedó.
 */
export function prepararCambio<T extends { readonly id: string }>(
  vigente: T | undefined,
  base: T | null,
  editado: T,
): ResultadoCambio {
  if (!base) return vigente ? { tipo: 'ya-existe' } : { tipo: 'listo', cambio: sinVacios(editado) };
  if (!vigente) return { tipo: 'inexistente' };
  const cambios = camposCambiados(base, editado);
  delete cambios['id'];
  const campos = Object.keys(cambios);
  if (!campos.length) return { tipo: 'sin-cambios' };
  const actual = vigente as unknown as Campos;
  const inicial = base as unknown as Campos;
  const conflictos = campos.filter(
    (campo) => !iguales(actual[campo], inicial[campo]) && !iguales(actual[campo], cambios[campo]),
  );
  if (conflictos.length) return { tipo: 'conflicto', campos: conflictos };
  return { tipo: 'listo', cambio: { id: editado.id, ...cambios } };
}

/** Nombre en español de los campos que más se editan, para el aviso de un conflicto. */
const NOMBRES_DE_CAMPO: Readonly<Record<string, string>> = {
  name: 'el nombre',
  sku: 'el SKU',
  price: 'el precio',
  stock: 'el stock',
  description: 'la descripción',
  imageUrl: 'la imagen principal',
  thumbnailUrl: 'la miniatura',
  gallery: 'la galería de fotos',
  highlights: 'las características',
  categoryId: 'la categoría',
  brandId: 'la marca',
  active: 'el estado',
  parentId: 'la categoría padre',
  order: 'el orden',
  email: 'el correo',
  document: 'el documento',
  role: 'el rol',
  status: 'el estado',
  providerResponse: 'la respuesta',
  title: 'el título',
  startAt: 'la fecha de inicio',
  endAt: 'la fecha de fin',
  origin: 'el origen',
  destination: 'el distrito',
};

function enumerar(partes: readonly string[]): string {
  return partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/** Aviso para la persona cuando un cambio no se puede enviar; `null` si se envía o no hay nada que avisar. */
export function avisoDeCambio(resultado: ResultadoCambio): string | null {
  if (resultado.tipo === 'inexistente')
    return 'Este registro ya no existe: otra persona lo eliminó. No se volvió a crear.';
  if (resultado.tipo === 'conflicto') {
    const nombres = resultado.campos.map((campo) => NOMBRES_DE_CAMPO[campo]);
    const que = nombres.every(Boolean) ? enumerar(nombres) : 'estos mismos datos';
    return `Mientras editabas, otra persona cambió ${que}. No se guardó: revisa los datos actuales y vuelve a intentarlo.`;
  }
  return null;
}

/** Cambios entre dos versiones de una colección: registros agregados o distintos (completos) e `id` quitados. */
export function cambiosEntreListas<T extends { readonly id: string }>(
  antes: readonly T[],
  despues: readonly T[],
): { upsert: T[]; remove: string[] } {
  const previos = new Map(antes.map((item) => [item.id, item]));
  const siguen = new Set(despues.map((item) => item.id));
  return {
    upsert: despues.filter((item) => !iguales(previos.get(item.id), item)),
    remove: antes.filter((item) => !siguen.has(item.id)).map((item) => item.id),
  };
}
