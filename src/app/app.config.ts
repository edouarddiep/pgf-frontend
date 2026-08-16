import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { loadingInterceptor } from '@shared/interceptors/loading.interceptor';
import {adminHeaderInterceptor} from '@shared/interceptors/admin-header.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withViewTransitions({
        onViewTransitionCreated: () => {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
      })
    ),
    provideClientHydration(
      withEventReplay(),
      // Les expositions en cours conditionnent l'affichage d'une section entière :
      // cet appel doit refléter la base à chaque visite, et non l'état figé au
      // dernier build. Tous les autres appels restent servis par le transfer state.
      withHttpTransferCacheOptions({
        filter: request => !request.url.includes('/exhibitions/ongoing')
      })
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([loadingInterceptor, adminHeaderInterceptor])
    ),
    provideAnimations()
  ]
};
