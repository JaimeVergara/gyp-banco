import { Component, computed, input } from '@angular/core';

// Íconos de línea (estilo Lucide) dibujados en SVG, sin librerías externas.
const ICONOS: Record<string, string[]> = {
  escudo: [
    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    'M9 12l2 2 4-4',
  ],
  nfc: [
    'M6 8.32a7.43 7.43 0 0 1 0 7.36',
    'M9.46 6.21a11.76 11.76 0 0 1 0 11.58',
    'M12.91 4.1a15.91 15.91 0 0 1 .01 15.8',
    'M16.37 2a20.16 20.16 0 0 1 0 20',
  ],
  qr: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h3v3h-3z', 'M20 14v3', 'M14 20h3', 'M20 20h1'],
  personas: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
    'M22 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  salir: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  copiar: ['M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z', 'M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2'],
  check: ['M20 6 9 17l-5-5'],
  x: ['M18 6 6 18', 'M6 6l12 12'],
  alerta: ['M12 9v4', 'M12 17h.01', 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'],
  bloqueado: ['M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0', 'M4.9 4.9l14.2 14.2'],
  camara: [
    'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z',
    'M12 13m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  ],
  atras: ['M19 12H5', 'M12 19l-7-7 7-7'],
  flecha: ['M9 18l6-6-6-6'],
  mas: ['M12 5v14', 'M5 12h14'],
  buscar: ['M11 11m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0', 'M21 21l-4.3-4.3'],
  energia: ['M12 2v10', 'M18.4 6.6a9 9 0 1 1-12.77.04'],
  inicio: ['M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  descargar: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  reloj: ['M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0', 'M12 6v6l4 2'],
  moneda: ['M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0', 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8', 'M12 18V6'],
  tarjeta: ['M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M2 10h20'],
  lista: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  menos: ['M5 12h14'],
  trofeo: ['M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22', 'M18 2H6v7a6 6 0 0 0 12 0V2z'],
  subir: ['M7 17 17 7', 'M7 7h10v10'],
  bajar: ['M17 7 7 17', 'M17 17H7V7'],
  chispa: ['M12 3l1.9 5.8L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.2z'],
};

@Component({
  selector: 'app-icono',
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @for (d of trazos(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
})
export class Icono {
  readonly nombre = input.required<string>();
  protected readonly trazos = computed(() => ICONOS[this.nombre()] ?? []);
}
