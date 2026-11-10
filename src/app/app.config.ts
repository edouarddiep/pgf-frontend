import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { environment } from '@environments/environment';
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
      // Le site est prérendu statiquement : le transfer state figerait les réponses
      // de l'API au dernier build, alors que leur contenu est édité depuis l'admin.
      // Aucun appel API n'est donc mis en cache, le navigateur interroge la base.
      withHttpTransferCacheOptions({
        filter: request => !request.url.startsWith(environment.apiUrl)
      })
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([loadingInterceptor, adminHeaderInterceptor])
    ),
    provideAnimations()
  ]
};
