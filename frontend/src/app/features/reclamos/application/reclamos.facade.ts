import { inject, Injectable, signal } from '@angular/core';

import { RegistrarReclamoCommand, ConstanciaReclamo } from '../domain/reclamo.model';
import { messageOf } from '../../../core/bff-request.error';
import { ReclamoGateway } from '../domain/reclamo.gateway';

@Injectable({ providedIn: 'root' })
export class ReclamosFacade {
  private readonly gateway = inject(ReclamoGateway);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  async submit(command: RegistrarReclamoCommand): Promise<ConstanciaReclamo | null> {
    if (this.submitting()) return null;
    this.submitting.set(true);
    this.error.set(null);
    try {
      return await this.gateway.submit(command);
    } catch (error) {
      this.error.set(messageOf(error, 'No pudimos registrar la solicitud.'));
      return null;
    } finally {
      this.submitting.set(false);
    }
  }
}
