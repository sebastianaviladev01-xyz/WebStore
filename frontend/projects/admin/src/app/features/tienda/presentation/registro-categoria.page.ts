import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { TiendaFacade } from '../application/tienda.facade';
import { estadoDeLaEdicion } from '../domain/edicion.rules';
import { mensajeDeError } from '../domain/formulario.rules';
import { motivoDeCategoriaRepetida, slugDe } from '../domain/registro-unico.rules';
import { conservarBorrador } from './borrador';
import { imagenDeCategoria } from './reducir-foto';
import { LADO_IMAGEN_CATEGORIA, motivoParaNoUsarFotoDeCategoria } from '../domain/foto.rules';
import { idsDescendientes, aplanarArbolCategorias } from '../domain/categoria.rules';
import { Categoria } from '../domain/tienda.model';
import { DatosRegistroComponent } from './datos-registro.component';
import { EncabezadoRegistroComponent } from './encabezado-registro.component';
import { PieRegistroComponent } from './pie-registro.component';
import { SeccionRegistroComponent } from './seccion-registro.component';
import { IconoDirective } from '../../../shared/ui/icono.directive';
import { SinDatosComponent } from '../../../shared/ui/sin-datos.component';
import { TextoAyudaComponent } from '../../../shared/ui/texto-ayuda.component';

/**
 * Interfaz de registro de una categoría (feature 008): `/categorias/nueva` y `/categorias/:id`. Es el formulario que
 * antes estaba junto a la lista, con los mismos campos, la exclusión de sí misma y de sus subcategorías y el aviso de
 * ciclo. Al editar trae los datos actuales con `refresh()`; con «Guardar», «Cancelar» y «Regresar» vuelve al listado
 * con sus filtros y su página (`queryParamsHandling: 'preserve'`). Desde el lote 44 (ADR-0033, PBI-0268) tiene la forma
 * de los formularios del SGC: secciones «Datos generales» e «Imagen», la fila de cabecera sin estado (la categoría no
 * lo tiene) y, al crear, «Guardar y continuar».
 */
@Component({
  selector: 'ws-category-form-page',
  imports: [
    DatosRegistroComponent,
    EncabezadoRegistroComponent,
    IconoDirective,
    PieRegistroComponent,
    SeccionRegistroComponent,
    SinDatosComponent,
    TextoAyudaComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <!--
      Lote 44 (ADR-0033, PBI-0268): la forma de los formularios del SGC. La categoría no tiene estado: la fila de cabecera
      solo dice el usuario y la fecha.
    -->
    <div class="admin-card grid max-w-4xl gap-6 p-5 sm:p-6">
      <ws-admin-encabezado-registro
        tituloId="titulo-formulario-categoria"
        [titulo]="(editing() ? 'Editar' : 'Nueva') + ' categoría'"
        [descripcion]="
          editing()
            ? 'Cambia el nombre, el lugar en el árbol o la imagen de la categoría.'
            : 'Completa el nombre, el lugar en el árbol y, si quieres, la imagen de la categoría.'
        "
        listado="/categorias"
      />
      @if (loadingCategory()) {
        <p class="border-t border-line pt-5 text-sm text-muted" role="status">Cargando…</p>
      } @else if (missing()) {
        <div class="border-t border-line pt-5" role="alert">
          <p class="font-semibold">Esta categoría ya no existe</p>
          <p class="mt-2 text-sm text-muted">
            Otra persona la eliminó. Vuelve al listado para ver las categorías actuales.
          </p>
        </div>
      } @else if (sinDatos()) {
        <!-- PBI-0256: la consulta falló y el panel no tenía la categoría; no se sabe si existe. -->
        <ws-admin-sin-datos registro="de la categoría" (reintentar)="reintentar()" />
      } @else {
        @if (borrador.aviso(); as aviso) {
          <p class="rounded-xl bg-warning-soft p-4 text-sm text-warning" role="status">
            {{ aviso }}
          </p>
        }
        @if (staleNotice()) {
          <p class="rounded-xl bg-warning-soft p-4 text-sm text-warning" role="alert">
            {{ staleNotice() }}
          </p>
        }
        <form
          [formGroup]="form"
          (ngSubmit)="save()"
          class="grid gap-6"
          aria-labelledby="titulo-formulario-categoria"
        >
          <ws-admin-datos-registro />
          <ws-admin-seccion-registro titulo="Datos generales" icono="datos">
            <!-- Con el error, el espacio de abajo crece para que un mensaje largo no tape el campo siguiente. -->
            <mat-form-field [subscriptSizing]="form.controls.name.hasError('repetido') ? 'dynamic' : 'fixed'">
              <mat-label>Nombre</mat-label>
              <input matInput formControlName="name" />
              <mat-error>{{ mensaje(form.controls.name.errors) }}</mat-error>
            </mat-form-field>
            <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <mat-form-field [subscriptSizing]="editing() ? 'dynamic' : 'fixed'">
                <mat-label>Categoría padre</mat-label>
                <mat-select formControlName="parentId">
                  <mat-option value="">Sin padre</mat-option>
                  @for (entry of parentOptions(); track entry.category.id) {
                    <mat-option [value]="entry.category.id">
                      {{ indent(entry.depth) }}{{ entry.category.name }}
                    </mat-option>
                  }
                </mat-select>
                @if (editing()) {
                  <mat-hint>
                    <ws-admin-texto-ayuda>
                      No se puede elegir la misma categoría ni una de sus subcategorías.
                    </ws-admin-texto-ayuda>
                  </mat-hint>
                }
              </mat-form-field>
              <mat-form-field>
                <mat-label>Orden (opcional)</mat-label>
                <input matInput type="number" formControlName="order" />
              </mat-form-field>
            </div>
          </ws-admin-seccion-registro>
          <ws-admin-seccion-registro titulo="Imagen" icono="banners">
            <!-- Lote 07b (PBI-0052): imagen pequeña opcional; sin ella, la tienda se ve como antes. -->
            <fieldset class="min-w-0 rounded-xl border border-line p-4">
              <legend class="px-1 text-sm font-semibold">Imagen de la categoría (opcional)</legend>
              <p class="text-xs text-muted">
                <ws-admin-texto-ayuda>
                  PNG, JPG o WebP de menos de 1 MB. Se guarda una sola versión de {{ ladoImagen }} ×
                  {{ ladoImagen }} px.
                </ws-admin-texto-ayuda>
              </p>
              @if (imagen()) {
                <img
                  [src]="imagen()"
                  alt="Imagen actual de la categoría"
                  class="mt-3 h-16 w-16 rounded-lg border border-line bg-subtle object-contain p-1"
                />
              }
              <div class="mt-3 flex flex-wrap items-center gap-3">
                <label
                  class="inline-flex items-center gap-2 cursor-pointer rounded-xl border border-line px-4 py-2.5 text-sm font-semibold"
                >
                  <svg wsAdminIcono="cargar"></svg>
                  {{ imagen() ? 'Cambiar imagen' : 'Cargar imagen' }}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    class="sr-only"
                    (change)="onImageSelected($event)"
                  />
                </label>
                @if (imagen()) {
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 min-h-10 text-sm font-semibold text-danger"
                    (click)="quitarImagen()"
                  >
                    <svg wsAdminIcono="quitar"></svg>
                    Quitar imagen
                  </button>
                }
              </div>
              @if (imageError()) {
                <p class="mt-2 text-xs font-semibold text-danger" role="alert">{{ imageError() }}</p>
              }
            </fieldset>
          </ws-admin-seccion-registro>
          <ws-admin-pie-registro
            listado="/categorias"
            [creando]="!editing()"
            [guardando]="admin.saving()"
            [continuando]="continuando()"
            (continuar)="save(true)"
          >
            @if (error()) {
              <p class="mb-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
                {{ error() }}
              </p>
            }
          </ws-admin-pie-registro>
        </form>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroCategoriaPage {
  protected readonly admin = inject(TiendaFacade);
  private readonly router = inject(Router);
  /** `:id` de `/categorias/:id` (`withComponentInputBinding`); no llega en `/categorias/nueva`. */
  readonly id = input<string>();
  protected readonly editing = computed(() => this.id() ?? null);
  /** Id de la categoría nueva, fijo mientras la página está abierta: un segundo envío no crea otra (PBI-0121). */
  private readonly idNuevo = crypto.randomUUID();
  /** La categoría tal como se cargó al abrir la edición: lo que cambió se calcula contra ella (PBI-0120). */
  private base: Categoria | null = null;
  /** Mientras la edición trae los datos actuales: «Cargando…» en lugar del formulario. */
  protected readonly loadingCategory = signal(false);
  /** La consulta respondió y la categoría en edición no está en el snapshot actual: otra persona la eliminó. */
  protected readonly missing = signal(false);
  /** PBI-0256: la consulta falló y el panel no tenía la categoría; se avisa del fallo con «Reintentar». */
  protected readonly sinDatos = signal(false);
  /** Aviso si no se pudieron traer los datos actuales y el formulario usa los que había en memoria. */
  protected readonly staleNotice = signal<string | null>(null);
  /** Aviso de ciclo o motivo del último guardado rechazado, junto al botón; el formulario conserva lo escrito. */
  protected readonly error = signal<string | null>(null);
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    parentId: new FormControl('', { nonNullable: true }),
    order: new FormControl<number | null>(null),
    /** Data URL de la imagen pequeña (PBI-0052); vacía si no tiene. */
    imageUrl: new FormControl('', { nonNullable: true }),
  });
  protected readonly imagen = toSignal(this.form.controls.imageUrl.valueChanges, { initialValue: '' });
  protected readonly imageError = signal<string | null>(null);
  protected readonly ladoImagen = LADO_IMAGEN_CATEGORIA;
  protected readonly mensaje = mensajeDeError;
  /** PBI-0151: lo escrito vuelve si la sesión venció a mitad de la edición; se aplica después de traer la categoría. */
  protected readonly borrador = conservarBorrador({
    form: this.form,
    guardar: () => this.form.getRawValue(),
    restaurar: (valor) => this.form.setValue(valor),
    diferido: true,
  });
  /** Lista en orden jerárquico: cada subcategoría debajo de su padre. */
  protected readonly tree = computed(() => aplanarArbolCategorias(this.admin.categories()));
  /** Una categoría no puede colgar de sí misma ni de una de sus subcategorías: formaría un ciclo en el menú de la tienda. */
  protected readonly parentOptions = computed(() => {
    const id = this.editing();
    if (!id) return this.tree();
    const excluded = idsDescendientes(this.admin.categories(), id);
    return this.tree().filter((entry) => entry.category.id !== id && !excluded.has(entry.category.id));
  });
  constructor() {
    // Al abrir la edición (o cambiar de `:id` sin salir de la página) se traen los datos actuales.
    effect(() => {
      const id = this.editing();
      if (id) untracked(() => void this.edit(id));
      else untracked(() => this.borrador.aplicar());
    });
  }
  /**
   * Acepta una foto PNG, JPG o WebP de menos de 1 MB y genera la única versión que se guarda, de 100 × 100 px (lote 11,
   * PBI-0176; el BFF de prueba no reduce imágenes, solo las valida).
   */
  protected onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.imageError.set(null);
    const motivo = motivoParaNoUsarFotoDeCategoria(file);
    if (motivo) {
      this.imageError.set(motivo);
      return;
    }
    void imagenDeCategoria(file).then((url) => {
      if (!url) {
        this.imageError.set('No pudimos reducir la imagen. Usa otra más simple.');
        return;
      }
      this.form.controls.imageUrl.setValue(url);
      this.form.markAsDirty();
    });
  }
  protected quitarImagen() {
    this.form.controls.imageUrl.setValue('');
    this.form.markAsDirty();
  }
  protected indent(depth: number) {
    return '  '.repeat(depth) + (depth ? '↳ ' : '');
  }
  /**
   * Trae el snapshot actual y rellena el formulario. Si la consulta responde sin la categoría, dice que ya no existe;
   * si falla, usa los datos que ya tenía el panel con un aviso o, si no los tenía, avisa del fallo (PBI-0256).
   */
  private async edit(id: string) {
    this.loadingCategory.set(true);
    this.missing.set(false);
    this.sinDatos.set(false);
    this.staleNotice.set(null);
    this.error.set(null);
    const consultaRespondio = await this.admin.refresh();
    const c = this.admin.categories().find((x) => x.id === id);
    const estado = estadoDeLaEdicion({ consultaRespondio, registroEncontrado: !!c });
    if (estado === 'desactualizada') {
      this.staleNotice.set(
        'No pudimos traer los datos actuales: la ficha muestra los últimos que cargó el panel.',
      );
    }
    this.missing.set(estado === 'no-existe');
    this.sinDatos.set(estado === 'sin-datos');
    this.base = c ?? null;
    if (c) {
      this.form.setValue({
        name: c.name,
        parentId: c.parentId ?? '',
        order: c.order ?? null,
        imageUrl: c.imageUrl ?? '',
      });
      this.borrador.aplicar();
    }
    this.loadingCategory.set(false);
  }
  /** «Reintentar» del aviso de PBI-0256: vuelve a pedir el snapshot. */
  protected reintentar() {
    const id = this.editing();
    if (id) void this.edit(id);
  }
  /** El guardado en curso lo pidió «Guardar y continuar» (lote 44, PBI-0268). */
  protected readonly continuando = signal(false);
  /**
   * Guarda la categoría. «Guardar» vuelve al listado; «Guardar y continuar» (`continuar`, solo al crear) abre el registro
   * creado en «Editar» para seguir completándolo, con los filtros del listado (lote 44, PBI-0268).
   */
  protected async save(continuar = false): Promise<void> {
    if (this.admin.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const id = this.editing() ?? this.idNuevo;
    if (v.parentId && (v.parentId === id || idsDescendientes(this.admin.categories(), id).has(v.parentId))) {
      this.error.set('Elige un padre que no sea la misma categoría ni una de sus subcategorías.');
      return;
    }
    // PBI-0148: dirección única, comprobada antes de enviar (el BFF la vuelve a comprobar). Un choque que ya existía
    // antes de editar (datos anteriores) no bloquea: solo se revisa si el nombre cambia de dirección.
    const repetida = motivoDeCategoriaRepetida(this.admin.categories(), { id, name: v.name });
    if (repetida && (!this.base || slugDe(this.base.name) !== slugDe(v.name))) {
      this.form.controls.name.setErrors({ repetido: repetida });
      this.form.controls.name.markAsTouched();
      return;
    }
    this.error.set(null);
    this.continuando.set(continuar);
    const saved = await this.admin.guardarCategoria(this.base, {
      id,
      name: v.name,
      parentId: v.parentId || undefined,
      order: v.order ?? undefined,
      // Sin imagen, el campo no va: si la tenía, el cambio la quita (`null`, PBI-0052).
      imageUrl: v.imageUrl || undefined,
    });
    this.continuando.set(false);
    if (saved) {
      await this.router.navigate(continuar ? ['/categorias', id] : ['/categorias'], {
        queryParamsHandling: 'preserve',
      });
      return;
    }
    this.error.set(this.admin.tomarError() ?? 'No pudimos guardar la categoría. Inténtalo de nuevo.');
  }
}
