import { avisosVigentes } from '../../domain/admin/aviso-programado.rules.mjs';
import { estilosDeLosBotones } from '../../domain/admin/colecciones.rules.mjs';
import { terminosVigentes } from '../../domain/admin/terminos.rules.mjs';
import { direccionDeImagen, direccionDelLogo } from '../catalogo/imagenes.queries.mjs';

/** Banner público con valores por defecto para los campos que el Admin no completó. */
const bannerToPublic = (banner) => ({
  id: banner.id,
  eyebrow: banner.eyebrow ?? 'Selección WebStore',
  title: banner.title,
  description: banner.description ?? 'Promoción configurable desde el panel administrativo.',
  // PBI-0184: los dos botones opcionales; uno sin configurar llega vacío y la tienda no lo muestra.
  ctaLabel: banner.cta ?? '',
  ctaUrl: banner.ctaUrl ?? '/catalogo',
  secondaryCtaLabel: banner.secondaryCta ?? '',
  secondaryCtaUrl: banner.secondaryCtaUrl ?? '',
  // Lote 46 (ADR-0033, PBI-0266): el estilo de cada botón, uno de los cuatro del tema; sin él, el de siempre.
  ...estilosDeLosBotones(banner),
  // Lote 24 (ADR-0026, PBI-0214): las imágenes cargadas llegan como dirección del BFF, no como Data URL.
  imageUrl: direccionDeImagen('banners', banner.id, 'image', banner.imageUrl ?? 'assets/brand/hero.svg'),
  mobileImageUrl: direccionDeImagen('banners', banner.id, 'mobile-image', banner.mobileImageUrl ?? ''),
  placement: banner.placement ?? 'hero',
  imageFit: banner.imageFit ?? 'contain',
  imageTone: banner.imageTone === 'dark' ? 'dark' : 'light',
  imageFocusY:
    typeof banner.imageFocusY === 'number' && Number.isFinite(banner.imageFocusY)
      ? Math.min(100, Math.max(0, banner.imageFocusY))
      : null,
  startAt: banner.startAt,
  endAt: banner.endAt,
  active: banner.active,
});

/**
 * Contenido público de la tienda: configuración del CMS y campañas. `now` es el reloj (inyectable en las pruebas).
 *
 * Lote 30 (ADR-0027, PBI-0244; confirmado por Sebastián Avila): los ajustes públicos solo traen los avisos vigentes en
 * el instante de cada lectura. Filtra el BFF, no la tienda: así la tienda no recibe avisos futuros y un aviso aparece y
 * desaparece sin guardar ni redesplegar, porque las respuestas JSON no se guardan en caché (`no-store`). El snapshot
 * del Admin trae todos los avisos.
 */
export function createContenidoQueries({ store, now = () => new Date() }) {
  return {
    // Lote 17 (PBI-0177): con la versión vigente de los términos, que el checkout envía al aceptarlos.
    getSettings: () => ({
      ...store.state.config,
      // Lote 50 (ADR-0037, PBI-0289): el logo cargado llega como dirección del BFF, como las demás imágenes.
      logoUrl: direccionDelLogo(store.state.config.logoUrl),
      announcements: avisosVigentes(store.state.config.announcements ?? [], now()),
      ...terminosVigentes(store.state.termsVersions),
    }),
    listBanners: () => store.state.banners.map(bannerToPublic),
  };
}
