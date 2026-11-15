import { bearerToken, cookie, created, css, ok, readJsonBody } from '../http.mjs';

/** Cookie con el id del tema de la tuerca; el BFF solo la lee en modo demo (ADR-0012). */
const COOKIE_VISTA_PREVIA = 'ws_tema_vista_previa';
const RUTA_TEMA = /^\/bff\/admin\/themes\/([^/]+)$/;

/** Id del tema en la ruta; si no se puede decodificar, el texto tal cual, que dará `THEME_NOT_FOUND`. */
function idDeLaRuta(path) {
  const id = RUTA_TEMA.exec(path)[1];
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

/** `?revision=N` como entero; ausente o no numérica, `undefined`, que el caso de uso rechaza con `STALE_THEMES`. */
function revisionDeLaConsulta(url) {
  const valor = url.searchParams.get('revision');
  return valor !== null && /^\d+$/.test(valor) ? Number(valor) : undefined;
}

/**
 * Apariencia y temas (ADR-0010 a ADR-0012). Las rutas públicas sirven la apariencia y `theme.css`; las del Admin
 * exigen `themes.manage` (solo `superadmin`) antes de leer el cuerpo. `theme.css` va antes que cualquier otra
 * ruta de `/bff/appearance`, y `/bff/admin/active-theme` no coincide con `/bff/admin/themes/:id`.
 */
export const temasRoutes = ({ consultas, casosDeUso, adminSesiones, modoDemo }) => {
  const exigirGestor = (req) => adminSesiones.requireAdmin(bearerToken(req), 'themes.manage');

  return [
    {
      method: 'GET',
      path: '/bff/appearance/theme.css',
      handle: ({ req }) =>
        css(consultas.hojaDeEstilos(modoDemo, modoDemo ? cookie(req, COOKIE_VISTA_PREVIA) : undefined), req, {
          varyByCookie: modoDemo,
        }),
    },
    { method: 'GET', path: '/bff/appearance', handle: () => ok(consultas.apariencia(modoDemo)) },
    {
      method: 'GET',
      path: '/bff/admin/themes',
      handle: ({ req }) => {
        exigirGestor(req);
        return ok(consultas.temasAdmin());
      },
    },
    {
      method: 'POST',
      path: '/bff/admin/themes',
      handle: async ({ req }) => {
        exigirGestor(req);
        return created(casosDeUso.crear(await readJsonBody(req)));
      },
    },
    {
      method: 'PUT',
      path: '/bff/admin/active-theme',
      handle: async ({ req }) => {
        exigirGestor(req);
        return ok(casosDeUso.activar(await readJsonBody(req)));
      },
    },
    {
      method: 'PUT',
      path: RUTA_TEMA,
      handle: async ({ req, path }) => {
        exigirGestor(req);
        return ok(casosDeUso.editar(idDeLaRuta(path), await readJsonBody(req)));
      },
    },
    {
      method: 'DELETE',
      path: RUTA_TEMA,
      handle: ({ req, url, path }) => {
        exigirGestor(req);
        return ok(casosDeUso.borrar(idDeLaRuta(path), revisionDeLaConsulta(url)));
      },
    },
  ];
};
