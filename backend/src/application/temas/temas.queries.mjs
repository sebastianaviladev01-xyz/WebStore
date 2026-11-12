import { TOKENS_DEL_TEMA, tokensDelTema } from '../../domain/temas/tema.rules.mjs';
import { TEMAS_PREDEFINIDOS } from '../../domain/temas/temas-predefinidos.mjs';

/**
 * Consultas de temas: la apariencia pública (tema activo o, en modo demo, todos), la vista del Admin y la hoja
 * de estilos `theme.css`. Solo lee `store.state.appearance`, cuya revisión es propia de los temas (ADR-0011).
 * Los `tokens` de un tema propio se calculan al leer y nunca se guardan.
 */

const TEMA_POR_DEFECTO = 'b';

const temaPredefinido = ({ id, name, colors, tokens }) => ({
  id,
  name,
  kind: 'predefined',
  colors: { ...colors },
  tokens: { ...tokens },
});

const temaPropio = ({ id, name, colors }) => ({
  id,
  name,
  kind: 'custom',
  colors: { ...colors },
  tokens: { ...tokensDelTema(colors, TEMAS_PREDEFINIDOS) },
});

/** Todos los temas como DTO `Tema`: A, B y C, y después los propios por nombre. */
export function temasDeLaApariencia(apariencia) {
  const propios = [...apariencia.customThemes]
    .sort((uno, otro) => uno.name.localeCompare(otro.name, 'es'))
    .map(temaPropio);
  return [...TEMAS_PREDEFINIDOS.map(temaPredefinido), ...propios];
}

/** Vista `TemasAdmin`: la revisión de los temas, el activo y todos los temas. */
export function vistaTemasAdmin(apariencia) {
  return {
    revision: apariencia.revision,
    activeThemeId: apariencia.activeThemeId,
    themes: temasDeLaApariencia(apariencia),
  };
}

const hojaDeEstilosDelTema = (tema) =>
  `:root:root {\n${TOKENS_DEL_TEMA.map((token) => `  ${token}: ${tema.tokens[token]};\n`).join('')}}\n`;

export function createTemasQueries({ store }) {
  const temas = () => temasDeLaApariencia(store.state.appearance);
  const buscar = (lista, id) => lista.find((tema) => tema.id === id);
  const temaActivo = (lista) =>
    buscar(lista, store.state.appearance.activeThemeId) ?? buscar(lista, TEMA_POR_DEFECTO);

  return {
    apariencia(modoDemo) {
      const lista = temas();
      const activo = temaActivo(lista);
      return {
        demoMode: modoDemo === true,
        activeThemeId: activo.id,
        themes: modoDemo === true ? lista : [activo],
      };
    },
    temasAdmin: () => vistaTemasAdmin(store.state.appearance),
    hojaDeEstilos(modoDemo, idVistaPrevia) {
      const lista = temas();
      const vistaPrevia = modoDemo === true ? buscar(lista, idVistaPrevia) : undefined;
      return hojaDeEstilosDelTema(vistaPrevia ?? temaActivo(lista));
    },
  };
}
