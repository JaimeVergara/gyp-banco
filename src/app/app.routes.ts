import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { Banco } from './banco';
import { Login } from './paginas/login';
import { Inicio } from './paginas/inicio';
import { Cobrar } from './paginas/cobrar';
import { Alumnos } from './paginas/alumnos';
import { Movimientos } from './paginas/movimientos';

// Sin sesión → login, recordando a dónde volver (ej: la tarjeta leída).
const conSesion: CanActivateFn = async (_ruta, estado) => {
  const router = inject(Router);
  if (await inject(Banco).haySesion()) return true;
  return router.createUrlTree(['/login'], { queryParams: { volver: estado.url } });
};

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', component: Inicio, canActivate: [conSesion] },
  // La etiqueta NFC guarda: …/#/t/CODIGO
  { path: 't/:codigo', component: Cobrar, canActivate: [conSesion] },
  { path: 'alumnos', component: Alumnos, canActivate: [conSesion] },
  { path: 'movimientos', component: Movimientos, canActivate: [conSesion] },
  {
    path: 'escanear',
    loadComponent: () => import('./paginas/escanear').then((m) => m.Escanear),
    canActivate: [conSesion],
  },
  { path: '**', redirectTo: '' },
];
