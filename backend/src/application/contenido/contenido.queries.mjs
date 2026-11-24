import { terminosVigentes } from '../../domain/admin/terminos.rules.mjs';
import { direccionDeImagen } from '../catalogo/imagenes.queries.mjs';

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

/** Contenido público de la tienda: configuración del CMS y campañas. */
export function createContenidoQueries({ store }) {
  return {
    // Lote 17 (PBI-0177): con la versión vigente de los términos, que el checkout envía al aceptarlos.
    getSettings: () => ({ ...store.state.config, ...terminosVigentes(store.state.termsVersions) }),
    listBanners: () => store.state.banners.map(bannerToPublic),
  };
}
