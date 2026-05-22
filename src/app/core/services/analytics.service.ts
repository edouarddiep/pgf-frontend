import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '@environments/environment';

declare let gtag: Function;

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  init(): void {
    if (!isPlatformBrowser(this.platformId) || !environment.gaId) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${environment.gaId}`;
    document.head.appendChild(script);

    window['dataLayer'] = window['dataLayer'] || [];
    window['gtag'] = function () { window['dataLayer'].push(arguments); };
    gtag('js', new Date());
    gtag('config', environment.gaId, { send_page_view: false });

    this.trackRouteChanges();
  }

  private trackRouteChanges(): void {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      filter((e: NavigationEnd) => !e.urlAfterRedirects.startsWith('/admin'))
    ).subscribe((e: NavigationEnd) => {
      gtag('event', 'page_view', {
        page_path: e.urlAfterRedirects,
        page_title: document.title
      });
    });
  }

  /** Tracks a custom GA4 event. Available for future use across components. */
  trackEvent(eventName: string, params?: Record<string, unknown>): void {
    if (!isPlatformBrowser(this.platformId)) return;
    gtag('event', eventName, params);
  }
}
