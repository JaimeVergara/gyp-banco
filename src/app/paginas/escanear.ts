import { Component, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import jsQR from 'jsqr';
import { Barra } from '../barra';

@Component({
  selector: 'app-escanear',
  imports: [Barra],
  template: `
    <app-barra titulo="Escanear tarjeta" subtitulo="Apunta al QR de la tarjeta" atras="/" />
    <main class="contenido">
      <div class="visor">
        <video #video playsinline muted></video>
        <div class="marco"></div>
      </div>
      <p class="aviso" [class.error]="mensajeError()">{{ mensaje() }}</p>
    </main>
  `,
})
export class Escanear implements OnInit, OnDestroy {
  private router = inject(Router);
  private video = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  readonly mensaje = signal('Apunta la cámara al código QR');
  readonly mensajeError = signal(false);
  private stream?: MediaStream;
  private lienzo = document.createElement('canvas');
  private activo = true;

  async ngOnInit() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch {
      this.mostrarError('No se pudo abrir la cámara. Revisa el permiso en el navegador.');
      return;
    }
    const video = this.video().nativeElement;
    video.srcObject = this.stream;
    await video.play();
    this.buscar();
  }

  ngOnDestroy() {
    this.activo = false;
    this.stream?.getTracks().forEach((t) => t.stop());
  }

  private buscar() {
    if (!this.activo) return;
    const video = this.video().nativeElement;
    if (video.videoWidth) {
      this.lienzo.width = video.videoWidth;
      this.lienzo.height = video.videoHeight;
      const ctx = this.lienzo.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(video, 0, 0);
      const imagen = ctx.getImageData(0, 0, this.lienzo.width, this.lienzo.height);
      const qr = jsQR(imagen.data, imagen.width, imagen.height);
      if (qr) {
        // El QR tiene la misma URL que la etiqueta: …/#/t/CODIGO
        const codigo = qr.data.match(/#\/t\/([^/?#]+)/)?.[1];
        if (codigo) {
          this.router.navigate(['/t', codigo]);
          return;
        }
        this.mostrarError('Este QR no es una tarjeta GYP');
      }
    }
    requestAnimationFrame(() => this.buscar());
  }

  private mostrarError(texto: string) {
    this.mensaje.set(texto);
    this.mensajeError.set(true);
  }
}
