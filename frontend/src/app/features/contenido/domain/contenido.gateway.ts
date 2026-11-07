import { Banner, ConfiguracionTienda } from './contenido.model';

/** Puerto del contenido editable desde el Admin (CMS). */
export abstract class ContenidoGateway {
  abstract getSettings(): Promise<Partial<ConfiguracionTienda>>;
  abstract getBanners(): Promise<readonly Banner[]>;
}
