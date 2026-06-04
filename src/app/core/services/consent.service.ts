import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const CONSENT_KEY = 'pgf_cookie_consent';
const ANALYTICS_KEY = 'pgf_cookie_analytics';
const GA_ID = 'G-JP50NGZH7G';

@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly consentGiven = signal<boolean | null>(null);
  readonly showSettings = signal(false);
  readonly analyticsEnabled = signal(false);

  init(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const stored = localStorage.getItem(CONSENT_KEY);
    const analytics = localStorage.getItem(ANALYTICS_KEY) === 'true';

    if (stored === 'accepted') {
      this.consentGiven.set(true);
      this.analyticsEnabled.set(true);
      this.loadGA4();
    } else if (stored === 'denied') {
      this.consentGiven.set(false);
      this.analyticsEnabled.set(false);
    } else if (stored === 'custom') {
      this.consentGiven.set(true);
      this.analyticsEnabled.set(analytics);
      if (analytics) {
        this.loadGA4();
      }
    } else {
      this.consentGiven.set(null);
    }
  }

  accept(): void {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    localStorage.setItem(ANALYTICS_KEY, 'true');
    this.consentGiven.set(true);
    this.analyticsEnabled.set(true);
    this.showSettings.set(false);
    this.loadGA4();
  }

  deny(): void {
    localStorage.setItem(CONSENT_KEY, 'denied');
    localStorage.setItem(ANALYTICS_KEY, 'false');
    this.consentGiven.set(false);
    this.analyticsEnabled.set(false);
    this.showSettings.set(false);
  }

  saveCustom(analytics: boolean): void {
    localStorage.setItem(CONSENT_KEY, 'custom');
    localStorage.setItem(ANALYTICS_KEY, String(analytics));
    this.consentGiven.set(true);
    this.analyticsEnabled.set(analytics);
    this.showSettings.set(false);
    if (analytics) {
      this.loadGA4();
    }
  }

  openSettings(): void {
    this.showSettings.set(true);
  }

  closeSettings(): void {
    this.showSettings.set(false);
  }

  reset(): void {
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem(ANALYTICS_KEY);
    this.consentGiven.set(null);
    this.analyticsEnabled.set(false);
    this.showSettings.set(false);
  }

  private loadGA4(): void {
    if (document.getElementById('ga4-script')) {
      return;
    }

    (window as any)[`ga-disable-${GA_ID}`] = false;
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) { (window as any).dataLayer.push(args); }
    gtag('js', new Date());
    gtag('config', GA_ID);

    const script = document.createElement('script');
    script.id = 'ga4-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
  }
}
