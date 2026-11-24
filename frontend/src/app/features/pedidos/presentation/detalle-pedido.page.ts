import { CurrencyPipe, DatePipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { PedidosFacade } from '../application/pedidos.facade';
import { EnviosFacade } from '../../envios/application/envios.facade';
import { ETIQUETAS_ESTADO_PEDIDO, Pedido } from '../domain/pedido.model';
import { esCambioDeFechaValido, fechaDeLima, fechaVisible } from '../domain/fecha-entrega.rules';
import { direccionVisible } from '../domain/direccion-por-producto.rules';
@Component({
  selector: 'ws-order-detail-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    NgOptimizedImage,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    RouterLink,
  ],
  template: `
    <section class="ws-container py-12">
      <a
        routerLink="/pedidos"
        class="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          class="h-4 w-4 fill-none stroke-current"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Mis pedidos
      </a>
      @if (loading()) {
        <div class="ws-card mt-8 p-8 text-center text-muted" role="status">Cargando pedido…</div>
      } @else if (order(); as o) {
        <div class="mt-7 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div class="grid gap-4">
            <section class="ws-card p-6">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="ws-eyebrow">Pedido</p>
                  <h1 class="text-3xl font-semibold">{{ o.id }}</h1>
                </div>
                <span class="rounded-full bg-soft px-3 py-1 text-sm font-semibold">
                  {{ statusLabels[o.status] }}
                </span>
              </div>
              <p class="mt-3 text-sm text-muted">
                <!-- La hora en es-PE termina en «p. m.», por eso no se agrega punto final después. -->
                Creado el {{ o.createdAt | date: 'd MMM y, h:mm a' }}
                @if (orders.canModify(o)) {
                  · Puedes cambiar la entrega o cancelarlo hasta el
                  {{ orders.editableUntil(o) | date: 'd MMM y, h:mm a' }}
                } @else if (orders.isOpen(o)) {
                  · Ya pasaron las 24 horas para cambiar la entrega o cancelarlo.
                }
              </p>
            </section>
            @for (item of o.items; track item.product.id) {
              <article class="ws-card flex gap-4 p-4">
                <!--
                  La caja conserva su tamaño; la foto va dentro con su proporción 4:3 (NG02952, PBI-0026). Se pinta a 96 px:
                  carga la miniatura, no la foto grande (NG02960, lote 18); un pedido antiguo sin miniatura usa la foto.
                -->
                <span class="grid h-20 w-28 shrink-0 place-items-center rounded-xl bg-soft p-2">
                  <img
                    [ngSrc]="item.product.thumbnailUrl || item.product.imageUrl"
                    [alt]="item.product.name"
                    width="96"
                    height="72"
                    class="h-16 w-auto max-w-full"
                  />
                </span>
                <div>
                  <h2 class="font-semibold">{{ item.product.name }}</h2>
                  <p class="text-sm text-muted">Cantidad: {{ item.quantity }}</p>
                  <!-- Lote 19 (PBI-0006): el producto que va a otra dirección (una por producto) la dice. -->
                  @if (item.shipping; as direccion) {
                    <p class="text-sm text-muted">Se entrega en: {{ direccionVisible(direccion) }}</p>
                  }
                  <strong>
                    {{ item.product.price * item.quantity | currency: 'PEN' : 'symbol' : '1.2-2' }}
                  </strong>
                </div>
              </article>
            }
            <section class="ws-card p-6">
              <h2 class="text-xl font-semibold">Dirección de entrega</h2>
              @if (o.shippingOrigin) {
                <p class="mt-1 text-sm text-muted">Despacho desde {{ o.shippingOrigin }}.</p>
              }
              @if (tieneOtrasDirecciones()) {
                <p class="mt-1 text-sm text-muted">
                  Los productos que van a otra dirección la conservan si cambias esta.
                </p>
              }
              <form [formGroup]="form" class="ws-outline-fields mt-4 grid gap-3 sm:grid-cols-2">
                <mat-form-field>
                  <mat-label>Dirección</mat-label>
                  <input matInput formControlName="addressLine" />
                  <mat-error>Ingresa la dirección.</mat-error>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Distrito</mat-label>
                  <mat-select formControlName="district">
                    @for (d of destinations(); track d) {
                      <mat-option [value]="d">{{ d }}</mat-option>
                    }
                  </mat-select>
                  <mat-error>Selecciona un distrito.</mat-error>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Provincia</mat-label>
                  <input matInput formControlName="province" />
                  <mat-error>Ingresa la provincia.</mat-error>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Departamento</mat-label>
                  <input matInput formControlName="department" />
                  <mat-error>Ingresa el departamento.</mat-error>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Referencia</mat-label>
                  <input matInput formControlName="reference" />
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Fecha de entrega</mat-label>
                  <input matInput type="date" formControlName="deliveryDate" [attr.min]="primera()" />
                  @if (form.controls.deliveryDate.hasError('required')) {
                    <mat-error>Elige una fecha de entrega.</mat-error>
                  } @else {
                    <mat-error>Elige una fecha desde el {{ fechaVisible(primera()) }}.</mat-error>
                  }
                </mat-form-field>
              </form>
              @if (orders.canModify(o)) {
                <button class="ws-btn-primary" type="button" [disabled]="saving()" (click)="saveAddress()">
                  {{ saving() ? 'Guardando…' : 'Actualizar dirección' }}
                </button>
                <p class="mt-2 text-xs text-muted">
                  Si cambias de distrito, el costo de envío se recalcula con la tabla de tarifas.
                </p>
              } @else {
                <p class="text-sm font-semibold text-muted">
                  El plazo de modificación ya venció o el pedido no permite cambios.
                </p>
              }
              @if (orders.error()) {
                <p class="mt-3 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
                  {{ orders.error() }}
                </p>
              }
              @if (notice()) {
                <p
                  class="mt-3 rounded-xl bg-primary-soft p-3 text-sm font-semibold text-on-primary-soft"
                  role="status"
                >
                  {{ notice() }}
                </p>
              }
            </section>
          </div>
          <aside class="ws-card h-fit p-6">
            <h2 class="text-xl font-semibold">Resumen</h2>
            <div class="mt-5 grid gap-3 text-sm">
              <div class="flex justify-between">
                <span>Valor de venta</span>
                <strong>{{ o.subtotal - o.igv | currency: 'PEN' : 'symbol' : '1.2-2' }}</strong>
              </div>
              <div class="flex justify-between">
                <span>IGV (18%)</span>
                <strong>{{ o.igv | currency: 'PEN' : 'symbol' : '1.2-2' }}</strong>
              </div>
              <div class="flex justify-between">
                <span>Envío</span>
                <strong>{{ o.shippingCost | currency: 'PEN' : 'symbol' : '1.2-2' }}</strong>
              </div>
              <div class="flex justify-between border-t pt-3">
                <span>Total</span>
                <strong class="text-xl">{{ o.total | currency: 'PEN' : 'symbol' : '1.2-2' }}</strong>
              </div>
            </div>
            @if (orders.canModify(o)) {
              <button class="mt-6 text-sm font-semibold text-danger" type="button" (click)="cancel()">
                Cancelar pedido
              </button>
            }
            <p class="mt-4 text-xs leading-5 text-muted">
              Si cancelas, el plazo del extorno depende del medio de pago que usaste.
            </p>
          </aside>
        </div>
      } @else if (orders.error()) {
        <div
          class="mt-8 rounded-xl border border-danger-line bg-danger-soft p-4 text-sm text-danger"
          role="alert"
        >
          <p>{{ orders.error() }}</p>
          <button type="button" class="mt-2 font-semibold underline underline-offset-4" (click)="ngOnInit()">
            Reintentar
          </button>
        </div>
      } @else {
        <div class="ws-card mt-8 p-8 text-center">
          <h1 class="text-3xl font-semibold">Pedido no encontrado</h1>
          <p class="mt-3 text-sm text-muted">
            Inicia sesión con la cuenta del pedido o ábrelo desde el dispositivo donde compraste.
          </p>
          <a routerLink="/cuenta/login" class="ws-btn-primary mt-6">Iniciar sesión</a>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetallePedidoPage implements OnInit {
  protected readonly statusLabels = ETIQUETAS_ESTADO_PEDIDO;
  readonly orderId = input.required<string>();
  protected readonly orders = inject(PedidosFacade);
  private readonly shipping = inject(EnviosFacade);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly order = computed(() => this.orders.get(this.orderId()));
  protected readonly direccionVisible = direccionVisible;
  /** Alguna línea va a otra dirección (una por producto, lote 19, PBI-0006). */
  protected readonly tieneOtrasDirecciones = computed(
    () => this.order()?.items.some((item) => item.shipping) ?? false,
  );
  protected readonly destinations = computed(() =>
    [...new Set(this.shipping.rates().map((r) => r.destination))].sort(),
  );
  /**
   * El mínimo del campo de fecha: la primera fecha de entrega de la tienda, la misma del checkout (PBI-0146; lote 17,
   * PBI-0178). Mientras no llega, hoy en Lima; el BFF vuelve a validar.
   */
  private readonly hoy = fechaDeLima(new Date());
  protected readonly primera = computed(() => this.orders.primeraFechaDeEntrega() ?? this.hoy);
  protected readonly fechaVisible = fechaVisible;
  /** Desde la primera fecha, o la fecha que el pedido ya tiene (el BFF la acepta aunque sea anterior). */
  private readonly fechaValida = (control: AbstractControl<string>): ValidationErrors | null =>
    !control.value || esCambioDeFechaValido(control.value, this.primera(), this.order()?.deliveryDate ?? '')
      ? null
      : { fechaPasada: true };
  protected readonly form = new FormGroup({
    addressLine: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    district: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    province: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    department: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    reference: new FormControl('', { nonNullable: true }),
    deliveryDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, this.fechaValida],
    }),
  });
  async ngOnInit() {
    this.loading.set(true);
    void this.orders.cargarPrimeraFechaDeEntrega();
    // Sin respuesta del BFF (sin conexión) se muestra lo que hay en memoria; si el BFF ya no lo autoriza (404), la
    // facade lo olvida y no se muestra (PBI-0104).
    const o = (await this.orders.load(this.orderId())) ?? this.orders.get(this.orderId());
    if (o) this.fill(o);
    this.loading.set(false);
  }
  private fill(o: Pedido) {
    this.form.setValue({
      addressLine: o.shipping.addressLine,
      district: o.shipping.district,
      province: o.shipping.province,
      department: o.shipping.department,
      reference: o.shipping.reference ?? '',
      deliveryDate: o.deliveryDate,
    });
  }
  protected async saveAddress() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.notice.set(null);
    const v = this.form.getRawValue();
    const currentDate = this.order()?.deliveryDate;
    // Son dos peticiones: se informa el resultado real de cada una (PBI-0096). Si la dirección falla, no se toca
    // la fecha; la fecha solo se envía si cambió.
    const address = await this.orders.updateShipping(this.orderId(), {
      addressLine: v.addressLine,
      district: v.district,
      province: v.province,
      department: v.department,
      reference: v.reference || undefined,
    });
    const date =
      address &&
      (v.deliveryDate === currentDate ||
        (await this.orders.updateDeliveryDate(this.orderId(), v.deliveryDate)));
    this.saving.set(false);
    if (address)
      this.notice.set(
        date ? 'Datos de entrega actualizados.' : 'Actualizamos la dirección, pero no la fecha de entrega.',
      );
  }
  protected async cancel() {
    if (confirm('¿Cancelar este pedido?') && (await this.orders.cancel(this.orderId())))
      this.notice.set('Pedido cancelado. El stock reservado volvió a estar disponible.');
  }
}
