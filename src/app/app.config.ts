import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Rutas con "#" (…/#/v/codigo): funcionan en GitHub Pages y en cualquier hosting.
    provideRouter(routes, withHashLocation(), withComponentInputBinding()),
  ],
};
