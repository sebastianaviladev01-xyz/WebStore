export type TipoReclamo = 'reclamo' | 'queja';

export interface RegistrarReclamoCommand {
  readonly name: string;
  readonly document: string;
  readonly email: string;
  readonly phone: string;
  readonly address: string;
  readonly subject: string;
  readonly amount: number;
  readonly type: TipoReclamo;
  readonly detail: string;
  readonly request: string;
}

export interface ConstanciaReclamo extends RegistrarReclamoCommand {
  readonly id: string;
  readonly status: 'received' | 'in-review' | 'resolved';
  readonly createdAt: string;
  readonly dueAt: string;
}
