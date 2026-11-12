import { DomainError } from '../../domain/comun/domain-error.mjs';
import { nowIso } from '../../domain/comun/reloj.mjs';
import { TEMAS_PREDEFINIDOS } from '../../domain/temas/temas-predefinidos.mjs';
import {
  exigirTemaBorrable,
  exigirTemaPropio,
  exigirTemaValido,
} from '../../domain/temas/tema-propio.rules.mjs';
import { vistaTemasAdmin } from './temas.queries.mjs';

/**
 * Casos de uso de los temas: crear, editar, borrar y activar. Cada uno exige primero la revisión vigente de
 * los temas (`appearance.revision`, propia e independiente de `state.revision`, ADR-0011), aplica las reglas
 * antes de mutar nada y, solo si todo pasa, cambia el estado, sube la revisión y guarda una vez.
 */

function exigirRevisionVigente(apariencia, revision) {
  if (revision !== apariencia.revision)
    throw new DomainError(
      'conflict',
      'STALE_THEMES',
      'Otra persona cambió los temas. Recarga la lista y vuelve a intentarlo.',
    );
}

export function createTemasUseCases({ store, security }) {
  const apariencia = () => store.state.appearance;

  /** Aplica `cambio` sobre la apariencia, sube la revisión, guarda una vez y devuelve la vista del Admin. */
  function confirmar(cambio) {
    const actual = apariencia();
    cambio(actual);
    actual.revision += 1;
    store.save();
    return vistaTemasAdmin(actual);
  }

  return {
    crear(entrada) {
      exigirRevisionVigente(apariencia(), entrada?.revision);
      const { name, colors } = exigirTemaValido(entrada, apariencia().customThemes);
      const ahora = nowIso();
      return confirmar((actual) => {
        actual.customThemes.push({ id: security.newId(), name, colors, createdAt: ahora, updatedAt: ahora });
      });
    },

    editar(id, entrada) {
      exigirRevisionVigente(apariencia(), entrada?.revision);
      const tema = exigirTemaPropio(id, apariencia().customThemes);
      const otros = apariencia().customThemes.filter((propio) => propio.id !== id);
      const { name, colors } = exigirTemaValido(entrada, otros);
      const ahora = nowIso();
      return confirmar(() => {
        tema.name = name;
        tema.colors = colors;
        tema.updatedAt = ahora;
      });
    },

    borrar(id, revision) {
      exigirRevisionVigente(apariencia(), revision);
      exigirTemaBorrable(id, apariencia());
      return confirmar((actual) => {
        actual.customThemes = actual.customThemes.filter((propio) => propio.id !== id);
      });
    },

    activar(entrada) {
      exigirRevisionVigente(apariencia(), entrada?.revision);
      const themeId = entrada?.themeId;
      const existe =
        TEMAS_PREDEFINIDOS.some((tema) => tema.id === themeId) ||
        apariencia().customThemes.some((propio) => propio.id === themeId);
      if (!existe) throw new DomainError('not-found', 'THEME_NOT_FOUND', 'El tema no existe.');
      return confirmar((actual) => {
        actual.activeThemeId = themeId;
      });
    },
  };
}
