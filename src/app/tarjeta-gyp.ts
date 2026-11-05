import { Component, computed, input } from '@angular/core';
import { Icono } from './icono';
import { Alumno, formatoGyp, tono } from './banco';

/** Tarjeta "bancaria" del alumno: el diseño que se ve al leer la etiqueta. */
@Component({
  selector: 'app-tarjeta-gyp',
  imports: [Icono],
  template: `
    <div class="tarjeta-gyp" [class.bloqueada]="!alumno().activo" [class.mini]="mini()" [style.--h]="h()">
      <div class="tg-fila">
        <span class="tg-marca"><app-icono nombre="moneda" /> GYP Bank</span>
        <app-icono class="tg-nfc" nombre="nfc" />
      </div>
      @if (!mini()) {
        <span class="tg-chip"></span>
      }
      <div class="tg-saldo">
        <small>Saldo disponible</small>
        <strong>{{ saldo() }}</strong>
      </div>
      <div class="tg-fila tg-pie">
        <div>
          <span class="tg-numero">•••• {{ ultimos() }}</span>
          <span class="tg-nombre">{{ alumno().nombre }}</span>
        </div>
        <span class="tg-curso">{{ alumno().activo ? alumno().curso || 'Alumno' : 'Bloqueada' }}</span>
      </div>
    </div>
  `,
})
export class TarjetaGyp {
  readonly alumno = input.required<Alumno>();
  readonly mini = input(false);
  protected readonly h = computed(() => tono(this.alumno().codigo));
  protected readonly saldo = computed(() => formatoGyp(this.alumno().saldo));
  protected readonly ultimos = computed(() => this.alumno().codigo.slice(-4).toUpperCase());
}
