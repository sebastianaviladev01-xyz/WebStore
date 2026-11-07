import { RegistrarReclamoCommand, ConstanciaReclamo } from './reclamo.model';

/** Puerto del Libro de Reclamaciones. Los fallos llegan como BffRequestError. */
export abstract class ReclamoGateway {
  abstract submit(command: RegistrarReclamoCommand): Promise<ConstanciaReclamo>;
}
