import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ConsentStatus, StoredConsent } from '@core/models/cookie-banner.model';

const CONSENT_KEY = 'pgf_consent';
const LEGACY_CONSENT_KEY = 'pgf_cookie_consent';
const LEGACY_ANALYTICS_KEY = 'pgf_cookie_analytics';

// Version des finalités : l'incrémenter re-sollicite le consentement de tous les visiteurs.
const CONSENT_VERSION = 1;
// 6 mois, durée recommandée par la CNIL avant de redemander le consentement.
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly consentGiven = signal<boolean | null>(null);
  readonly showSettings = signal(false);
  readonly analyticsEnabled = signal(false);
  // Reste à false au prerender : empêche la bannière d'être figée dans le HTML statique.
  readonly resolved = signal(false);

  init(): void {
    if (!this.isBrowser) {
      return;
    }

    const stored = this.read();
    if (stored) {
      this.consentGiven.set(stored.status !== 'denied');
      this.analyticsEnabled.set(stored.analytics);
    } else {
      this.consentGiven.set(null);
      this.analyticsEnabled.set(false);
    }

    this.resolved.set(true);
  }

  accept(): void {
    this.save('accepted', true);
  }

  deny(): void {
    this.save('denied', false);
  }

  saveCustom(analytics: boolean): void {
    this.save('custom', analytics);
  }

  openSettings(): void {
    this.showSettings.set(true);
  }

  closeSettings(): void {
    this.showSettings.set(false);
  }

  reset(): void {
    if (this.isBrowser) {
      this.document.cookie = `${CONSENT_KEY}=; Max-Age=0; Path=/; SameSite=Lax${this.cookieDomain()}${this.cookieSecure()}`;
      localStorage.removeItem(CONSENT_KEY);
      localStorage.removeItem(LEGACY_CONSENT_KEY);
      localStorage.removeItem(LEGACY_ANALYTICS_KEY);
    }

    this.consentGiven.set(null);
    this.analyticsEnabled.set(false);
    this.showSettings.set(false);
  }

  private save(status: ConsentStatus, analytics: boolean): void {
    const consent: StoredConsent = {
      version: CONSENT_VERSION,
      status,
      analytics,
      date: new Date().toISOString()
    };

    this.write(consent);
    this.consentGiven.set(status !== 'denied');
    this.analyticsEnabled.set(analytics);
    this.showSettings.set(false);
  }

  private write(consent: StoredConsent): void {
    if (!this.isBrowser) {
      return;
    }

    const raw = encodeURIComponent(JSON.stringify(consent));
    // Cookie first-party : partagé entre apex et www, et bien plus résistant au nettoyage
    // navigateur que le localStorage. Le localStorage sert de filet de secours.
    this.document.cookie = `${CONSENT_KEY}=${raw}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${this.cookieDomain()}${this.cookieSecure()}`;
    localStorage.setItem(CONSENT_KEY, raw);
    localStorage.removeItem(LEGACY_CONSENT_KEY);
    localStorage.removeItem(LEGACY_ANALYTICS_KEY);
  }

  private read(): StoredConsent | null {
    const raw = this.readCookie() ?? localStorage.getItem(CONSENT_KEY);
    if (!raw) {
      return this.readLegacy();
    }

    try {
      const consent: StoredConsent = JSON.parse(decodeURIComponent(raw));
      if (consent.version !== CONSENT_VERSION || this.isExpired(consent.date)) {
        return null;
      }
      return consent;
    } catch {
      return null;
    }
  }

  // Reprise de l'ancien format pour ne pas re-solliciter les visiteurs déjà consentants.
  private readLegacy(): StoredConsent | null {
    const status = localStorage.getItem(LEGACY_CONSENT_KEY) as ConsentStatus | null;
    if (!status) {
      return null;
    }

    const consent: StoredConsent = {
      version: CONSENT_VERSION,
      status,
      analytics: status === 'accepted' || localStorage.getItem(LEGACY_ANALYTICS_KEY) === 'true',
      date: new Date().toISOString()
    };

    this.write(consent);
    return consent;
  }

  private readCookie(): string | null {
    const match = this.document.cookie.match(new RegExp(`(?:^|; )${CONSENT_KEY}=([^;]*)`));
    return match ? match[1] : null;
  }

  private isExpired(date: string): boolean {
    const age = Date.now() - new Date(date).getTime();
    return Number.isNaN(age) || age > CONSENT_MAX_AGE_SECONDS * 1000;
  }

  // `.domaine.ch` pour que www et apex partagent le consentement ; hôte seul sinon
  // (localhost, *.vercel.app : un domaine explicite y serait rejeté).
  private cookieDomain(): string {
    const host = this.document.location.hostname;
    if (!host.startsWith('www.')) {
      return '';
    }
    return `; Domain=.${host.slice(4)}`;
  }

  private cookieSecure(): string {
    if (this.document.location.protocol !== 'https:') {
      return '';
    }
    return '; Secure';
  }
}
