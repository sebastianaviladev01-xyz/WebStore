import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { CarritoFacade } from '../../carrito/application/carrito.facade';
import { CheckoutFacade } from '../application/checkout.facade';
import { EnviosFacade } from '../../envios/application/envios.facade';
import { MetodoPago } from '../../pedidos/domain/pedido.model';
import { CotizacionEnvio } from '../../envios/domain/envio.model';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { esFechaDeEntregaValida, fechaDeEntregaPropuesta, fechaDeLima } from '../domain/fecha-entrega.rules';

/** La fecha de entrega va desde hoy en Lima (PBI-0096); vacía, la marca `required`. */
const desdeHoyEnLima =
  (hoy: string) =>
  (control: AbstractControl<string>): ValidationErrors | null =>
    !control.value || esFechaDeEntregaValida(control.value, hoy) ? null : { fechaPasada: true };

@Component({
  selector: 'ws-checkout-page',
  imports: [
    CurrencyPipe,
    EmptyStateComponent,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  template: `
    <section class="ws-container py-10 sm:py-14">
      <div class="mb-9">
        <h1 class="ws-title">Finalizar compra</h1>
      </div>
      @if (cart.cargando()) {
        <div class="ws-card p-8 text-center text-muted" role="status">Cargando tu carrito…</div>
      } @else if (cart.error()) {
        <div class="rounded-xl border border-danger-line bg-danger-soft p-4 text-sm text-danger" role="alert">
          <p>No pudimos cargar tu carrito. Revisa tu conexión e inténtalo nuevamente.</p>
          <button
            type="button"
            class="mt-2 font-semibold underline underline-offset-4"
            (click)="cart.reintentar()"
          >
            Reintentar
          </button>
        </div>
      } @else if (cart.isEmpty()) {
        <ws-empty-state
          title="No hay productos para comprar"
          description="Agrega productos al carrito antes de continuar."
        />
      } @else {
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          class="grid gap-7 lg:grid-cols-[1fr_380px] lg:items-start"
        >
          <div class="grid gap-6">
            <div class="ws-checkout-panel">
              <section class="ws-checkout-step">
                <h2 class="ws-checkout-step-title">1. Datos del cliente</h2>
                <p class="mt-2 text-sm leading-6 text-muted">
                  Puedes comprar sin crear una cuenta. Usaremos estos datos para registrar tu compra.
                </p>
                <div class="mt-5 grid gap-4 sm:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Nombres y apellidos</mat-label>
                    <input matInput formControlName="fullName" autocomplete="name" />
                    @if (form.controls.fullName.touched && form.controls.fullName.invalid) {
                      <mat-error>Ingresa al menos 3 caracteres.</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Correo</mat-label>
                    <input matInput type="email" formControlName="email" autocomplete="email" />
                    @if (form.controls.email.touched && form.controls.email.invalid) {
                      <mat-error>Ingresa un correo válido.</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Teléfono</mat-label>
                    <input matInput formControlName="phone" autocomplete="tel" />
                    @if (form.controls.phone.touched && form.controls.phone.invalid) {
                      <mat-error>Ingresa un teléfono válido.</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>DNI / documento</mat-label>
                    <input matInput formControlName="document" autocomplete="off" />
                    @if (form.controls.document.touched && form.controls.document.invalid) {
                      <mat-error>Ingresa al menos 8 caracteres.</mat-error>
                    }
                  </mat-form-field>
                </div>
              </section>
              <section class="ws-checkout-step">
                <h2 class="ws-checkout-step-title">2. Entrega</h2>
                <p class="mt-2 text-sm leading-6 text-muted">
                  Calculamos el costo según el distrito de destino y despachamos desde la tienda más cercana.
                </p>
                <div class="mt-5 grid gap-4 sm:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Distrito destino</mat-label>
                    <mat-select formControlName="district" (selectionChange)="refreshQuote()">
                      @for (d of destinations(); track d) {
                        <mat-option [value]="d">{{ d }}</mat-option>
                      }
                    </mat-select>
                    @if (form.controls.district.touched && form.controls.district.invalid) {
                      <mat-error>Selecciona un distrito.</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Dirección</mat-label>
                    <input matInput formControlName="addressLine" autocomplete="street-address" />
                    @if (form.controls.addressLine.touched && form.controls.addressLine.invalid) {
                      <mat-error>Ingresa una dirección válida.</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Provincia</mat-label>
                    <input matInput formControlName="province" />
                    @if (form.controls.province.touched && form.controls.province.invalid) {
                      <mat-error>Ingresa la provincia.</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Departamento</mat-label>
                    <input matInput formControlName="department" />
                    @if (form.controls.department.touched && form.controls.department.invalid) {
                      <mat-error>Ingresa el departamento.</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Fecha de entrega preferida</mat-label>
                    <input matInput type="date" formControlName="deliveryDate" [attr.min]="today" />
                    @if (
                      form.controls.deliveryDate.touched && form.controls.deliveryDate.hasError('required')
                    ) {
                      <mat-error>Elige una fecha de entrega.</mat-error>
                    } @else if (form.controls.deliveryDate.touched && form.controls.deliveryDate.invalid) {
                      <mat-error>Elige una fecha desde hoy.</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Referencia</mat-label>
                    <input matInput formControlName="reference" />
                  </mat-form-field>
                </div>
                @if (shipping.error()) {
                  <div
                    class="rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger"
                    role="alert"
                  >
                    <p>{{ shipping.error() }}</p>
                    <button
                      type="button"
                      class="mt-2 font-semibold underline underline-offset-4"
                      (click)="shipping.load()"
                    >
                      Reintentar
                    </button>
                  </div>
                }
                @if (quoting()) {
                  <p class="rounded-xl bg-soft p-3 text-sm text-muted" role="status">
                    Calculando costo de envío…
                  </p>
                }
                @if (shippingError()) {
                  <div
                    class="rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger"
                    role="alert"
                  >
                    <p>{{ shippingError() }}</p>
                    <button
                      type="button"
                      class="mt-2 font-semibold underline underline-offset-4"
                      (click)="refreshQuote()"
                    >
                      Reintentar
                    </button>
                  </div>
                }
                @if (!quoting() && !shippingError() && shippingQuote(); as quote) {
                  <p class="rounded-xl bg-primary-soft p-3 text-sm font-semibold text-on-primary-soft">
                    Envío cotizado:
                    <span class="ws-price-numerals">
                      {{ quote.price | currency: 'PEN' : 'symbol' : '1.2-2' }}
                    </span>
                    · despacho desde {{ quote.origin }}
                  </p>
                }
              </section>
              <section class="ws-checkout-step">
                <h2 class="ws-checkout-step-title">3. Método de pago</h2>
                <mat-radio-group formControlName="paymentMethod" class="mt-5 grid gap-3">
                  <mat-radio-button value="card">Tarjeta de crédito o débito</mat-radio-button>
                  <mat-radio-button value="yape-plin">Yape / Plin</mat-radio-button>
                  <mat-radio-button value="transfer">Transferencia bancaria</mat-radio-button>
                </mat-radio-group>
                <p class="mt-4 text-sm leading-6 text-muted">
                  Tienda de demostración: el pago se simula y no se realiza ningún cobro.
                </p>
              </section>
            </div>
          </div>
          <aside class="ws-order-summary">
            <h2 class="text-xl font-semibold tracking-[-0.025em]">Resumen del pedido</h2>
            <div class="mt-6 grid gap-4 text-sm">
              <div class="flex justify-between">
                <span>Valor de venta</span>
                <strong class="ws-price-numerals">
                  {{ cart.taxableBase() | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </strong>
              </div>
              <div class="flex justify-between">
                <span>IGV (18%)</span>
                <strong class="ws-price-numerals">
                  {{ cart.igv() | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </strong>
              </div>
              <div class="flex justify-between">
                <span>Subtotal</span>
                <strong class="ws-price-numerals">
                  {{ cart.subtotal() | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </strong>
              </div>
              <div class="flex justify-between">
                <span>Envío</span>
                <strong class="ws-price-numerals">
                  {{
                    shippingCost() === null
                      ? 'Selecciona destino'
                      : (shippingCost()! | currency: 'PEN' : 'symbol' : '1.2-2')
                  }}
                </strong>
              </div>
              <div class="flex justify-between border-t border-line pt-4">
                <span class="font-semibold">Total</span>
                <strong class="ws-price-numerals text-2xl font-semibold">
                  {{ total() | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </strong>
              </div>
            </div>
            @if (notices().length) {
              <div class="mt-4 rounded-xl bg-soft p-3 text-sm" role="status">
                <p class="font-semibold">Actualizamos tu pedido con los datos vigentes:</p>
                <ul class="mt-2 grid list-disc gap-1 pl-5">
                  @for (notice of notices(); track $index) {
                    <li>{{ notice }}</li>
                  }
                </ul>
                <p class="mt-2">Revisa el total antes de finalizar la compra.</p>
              </div>
            }
            <div class="mt-6">
              <mat-checkbox formControlName="termsAccepted" aria-describedby="ws-terms-error">
                Acepto los términos y condiciones
              </mat-checkbox>
              <p id="ws-terms-error" class="text-xs text-danger" aria-live="polite">
                @if (form.controls.termsAccepted.touched && form.controls.termsAccepted.invalid) {
                  Acepta los términos y condiciones para finalizar la compra.
                }
              </p>
              <a
                routerLink="/info/terminos"
                target="_blank"
                rel="noopener"
                class="mt-1 inline-block text-sm font-semibold text-link underline-offset-4 hover:underline"
              >
                Leer los términos y condiciones
              </a>
            </div>
            @if (checkout.error()) {
              <p class="mt-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
                {{ checkout.error() }}
              </p>
            }
            <button
              type="submit"
              class="ws-btn-primary mt-6 w-full disabled:opacity-50"
              [disabled]="checkout.submitting() || quoting() || shippingCost() === null"
            >
              {{ checkout.submitting() ? 'Procesando…' : 'Finalizar compra' }}
            </button>
            <a routerLink="/carrito" class="ws-btn-secondary mt-3 w-full">Volver al carrito</a>
          </aside>
        </form>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CurrencyPipe],
})
export class CheckoutPage {
  protected readonly cart = inject(CarritoFacade);
  protected readonly checkout = inject(CheckoutFacade);
  protected readonly shipping = inject(EnviosFacade);
  private readonly router = inject(Router);
  private readonly currency = inject(CurrencyPipe);
  /** Hoy en Lima: el mínimo del campo de fecha (PBI-0096). */
  protected readonly today = fechaDeLima(new Date());
  /** Cotizaciones pedidas: solo cuenta la última (PBI-0107). */
  private quoteRequest = 0;
  /** El envío cambió entre lo que vio el comprador y lo vigente (PBI-0106). */
  private readonly shippingChange = signal<{ antes: number; ahora: number } | null>(null);
  /** Lo que cambió desde lo que vio el comprador: precio, stock o envío (PBI-0106). */
  protected readonly notices = computed(() => {
    const money = (value: number) => this.currency.transform(value, 'PEN', 'symbol', '1.2-2');
    const notices = this.cart.cambios().map((cambio) => {
      if (cambio.tipo === 'precio')
        return `El precio de ${cambio.nombre} cambió de ${money(cambio.antes)} a ${money(cambio.ahora)}.`;
      if (cambio.tipo === 'stock')
        return `De ${cambio.nombre} solo quedan ${cambio.ahora} unidades: ajustamos la cantidad.`;
      return `${cambio.nombre} ya no está disponible y salió del carrito.`;
    });
    const shipping = this.shippingChange();
    if (shipping) notices.push(`El envío cambió de ${money(shipping.antes)} a ${money(shipping.ahora)}.`);
    return notices;
  });
  protected readonly shippingQuote = signal<CotizacionEnvio | null>(null);
  protected readonly shippingCost = computed(() => this.shippingQuote()?.price ?? null);
  protected readonly quoting = signal(false);
  protected readonly shippingError = signal<string | null>(null);
  protected readonly destinations = computed(() =>
    [...new Set(this.shipping.rates().map((r) => r.destination))].sort(),
  );
  protected readonly total = computed(() => this.cart.subtotal() + (this.shippingCost() ?? 0));
  protected readonly form = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(7)],
    }),
    document: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    addressLine: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5)],
    }),
    district: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    province: new FormControl('Lima', { nonNullable: true, validators: [Validators.required] }),
    department: new FormControl('Lima', { nonNullable: true, validators: [Validators.required] }),
    reference: new FormControl('', { nonNullable: true }),
    deliveryDate: new FormControl(fechaDeEntregaPropuesta(new Date()), {
      nonNullable: true,
      validators: [Validators.required, desdeHoyEnLima(this.today)],
    }),
    paymentMethod: new FormControl<MetodoPago>('card', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    termsAccepted: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  constructor() {
    this.checkout.iniciar();
  }

  protected async refreshQuote(): Promise<void> {
    const value = this.form.getRawValue();
    const request = ++this.quoteRequest;
    this.shippingQuote.set(null);
    this.shippingError.set(null);
    if (!value.district) {
      this.quoting.set(false);
      return;
    }

    this.quoting.set(true);
    try {
      const quote = await this.shipping.quote(value.district);
      // Llegó la respuesta de un distrito anterior: vale la del elegido ahora.
      if (request !== this.quoteRequest) return;
      if (quote === null) {
        this.shippingError.set(
          'Todavía no contamos con una tarifa para ese destino. Elige otro distrito o inténtalo nuevamente.',
        );
        return;
      }
      this.shippingQuote.set(quote);
    } catch {
      if (request !== this.quoteRequest) return;
      this.shippingError.set(
        'No pudimos calcular el envío en este momento. Revisa tu conexión e inténtalo nuevamente.',
      );
    } finally {
      if (request === this.quoteRequest) this.quoting.set(false);
    }
  }
  protected async submit(): Promise<void> {
    if (this.form.invalid || this.cart.isEmpty() || this.shippingCost() === null) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const shownShipping = this.shippingCost()!;
    const receipt = await this.checkout.submit({
      customer: { fullName: v.fullName, email: v.email, phone: v.phone, document: v.document },
      shipping: {
        addressLine: v.addressLine,
        district: v.district,
        province: v.province,
        department: v.department,
        reference: v.reference || undefined,
      },
      deliveryDate: v.deliveryDate,
      paymentMethod: v.paymentMethod,
      items: this.cart.items(),
      subtotal: this.cart.subtotal(),
      igv: this.cart.igv(),
      shippingCost: this.shippingCost()!,
      total: this.total(),
      termsAccepted: v.termsAccepted,
    });
    if (!receipt) {
      // Cambiaron el precio, el stock o el envío: se vuelve a cotizar y se avisa antes de reintentar (PBI-0106).
      if (this.checkout.datosCambiaron()) {
        await this.refreshQuote();
        const current = this.shippingCost();
        if (current !== null && current !== shownShipping)
          this.shippingChange.set({ antes: shownShipping, ahora: current });
      }
      return;
    }
    this.cart.clear();
    await this.router.navigate(['/pedido', receipt.id]);
  }
}
