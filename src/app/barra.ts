import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Icono } from './icono';
import { Banco } from './banco';

@Component({
  selector: 'app-barra',
  imports: [RouterLink, Icono],
  template: `
    <header class="barra">
      @if (atras()) {
        <a class="icono-btn" [routerLink]="atras()" aria-label="Volver"><app-icono nombre="atras" /></a>
      } @else {
        <span class="logo"><app-icono nombre="moneda" /></span>
      }
      <div class="barra-titulo">
        <strong>{{ titulo() }}</strong>
        @if (subtitulo()) {
          <span>{{ subtitulo() }}</span>
        }
      </div>
      @if (banco.demo()) {
        <span class="insignia demo">Demo</span>
      }
      <button class="icono-btn" (click)="salir()" aria-label="Cerrar sesión" title="Cerrar sesión">
        <app-icono nombre="salir" />
      </button>
    </header>
  `,
})
export class Barra {
  protected banco = inject(Banco);
  private router = inject(Router);

  readonly titulo = input.required<string>();
  readonly subtitulo = input<string | null>();
  readonly atras = input<string>();

  async salir() {
    await this.banco.salir();
    this.router.navigateByUrl('/login');
  }
}
