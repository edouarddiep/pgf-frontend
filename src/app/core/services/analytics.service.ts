import { effect, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '@environments/environment';
import { ConsentService } from '@core/services/consent.service';

declare let gtag: Function;

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly consentService = inject(ConsentService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private loaded = false;

  constructor() {
    // GA n'est chargé qu'après consentement explicite, et une seule fois.
    effect(() => {
      if (this.consentService.analyticsEnabled()) {
        this.load();
      }
    });
  }

  trackEvent(eventName: string, params?: Record<string, unknown>): void {
    if (!this.loaded) {
      return;
    }
    gtag('event', eventName, params);
  }

  private load(): void {
    if (this.loaded || !this.isBrowser || !environment.gaId) {
      return;
    }
    this.loaded = true;

    window[`ga-disable-${environment.gaId}`] = false;
    window['dataLayer'] = window['dataLayer'] || [];
    window['gtag'] = function () { window['dataLayer'].push(arguments); };

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${environment.gaId}`;
    document.head.appendChild(script);

    gtag('js', new Date());
    // send_page_view désactivé : les vues sont émises manuellement pour suivre les navigations SPA.
    gtag('config', environment.gaId, { send_page_view: false });

    this.trackPageView(this.router.url);
    this.trackRouteChanges();
  }

  private trackRouteChanges(): void {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => this.trackPageView(event.urlAfterRedirects));
  }

  private trackPageView(url: string): void {
    if (url.startsWith('/admin')) {
      return;
    }

    gtag('event', 'page_view', {
      page_path: url,
      page_title: document.title
    });
  }
}
