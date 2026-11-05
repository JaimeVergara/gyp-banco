import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Icono } from '../icono';
import { Banco } from '../banco';

@Component({
  selector: 'app-login',
  imports: [FormsModule, Icono],
  template: `
    <main class="login">
      <div class="login-fondo" aria-hidden="true"></div>
      <div class="tarjeta login-caja">
        <span class="logo grande"><app-icono nombre="moneda" /></span>
        <h1>Banco GYP</h1>
        <p class="tenue">Entrega GYP Dollars acercando el teléfono a la tarjeta NFC del alumno</p>
        <form (ngSubmit)="ingresar()">
          <label class="campo">
            Correo
            <input type="email" name="correo" [(ngModel)]="correo" autocomplete="username" required />
          </label>
          <label class="campo">
            Contraseña
            <input type="password" name="clave" [(ngModel)]="clave" autocomplete="current-password" required />
          </label>
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <button class="btn primario bloque" [disabled]="cargando()">{{ cargando() ? 'Ingresando…' : 'Ingresar' }}</button>
        </form>
        <div class="separador"><span>o</span></div>
        <button class="btn bloque" (click)="demo()"><app-icono nombre="chispa" /> Probar en modo demo</button>
        <p class="nota tenue">El modo demo usa alumnos inventados y guarda todo solo en este navegador.</p>
      </div>
    </main>
  `,
})
export class Login {
  private banco = inject(Banco);
  private router = inject(Router);

  readonly volver = input<string>('/');
  correo = '';
  clave = '';
  readonly cargando = signal(false);
  readonly error = signal('');

  async ingresar() {
    this.cargando.set(true);
    this.error.set('');
    const error = await this.banco.ingresar(this.correo, this.clave);
    this.cargando.set(false);
    if (error) {
      this.error.set(error);
      return;
    }
    this.router.navigateByUrl(this.volver() || '/');
  }

  demo() {
    this.banco.entrarDemo();
    this.router.navigateByUrl(this.volver() || '/');
  }
}
