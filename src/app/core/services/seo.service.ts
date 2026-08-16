import { effect, inject, Injectable, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { TranslateService } from '@core/services/translate.service';

const SITE_ORIGIN = 'https://www.pierrette-gonsethfavre.ch';
const SITE_NAME = 'Pierrette Gonseth-Favre';
const DEFAULT_IMAGE = 'https://bhjpavcxhymxcadesnqy.supabase.co/storage/v1/object/public/oeuvres/yaya/images/Logo_site_yaya.png';
const MAX_DESCRIPTION_LENGTH = 160;
const LANG_PREFIX_PATTERN = /^\/(fr|en)-ch/;

/** `fr` et `en` sans région pour ne pas restreindre l'audience à la Suisse, `fr-CH` en plus pour le ciblage local. */
const ALTERNATES: ReadonlyArray<{ hreflang: string; lang: 'fr' | 'en' }> = [
  { hreflang: 'fr', lang: 'fr' },
  { hreflang: 'fr-CH', lang: 'fr' },
  { hreflang: 'en', lang: 'en' },
  { hreflang: 'x-default', lang: 'fr' }
];

export interface SeoPageData {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  jsonLd?: object[];
  noindex?: boolean;
}

export type SeoPageResolver = () => SeoPageData | null;

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly translateService = inject(TranslateService);

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects.split(/[?#]/)[0])
    ),
    { initialValue: this.router.url.split(/[?#]/)[0] }
  );

  private readonly resolver = signal<SeoPageResolver | null>(null);

  constructor() {
    effect(() => this.apply());
  }

  setPage(titleKey: string, descriptionKey: string, jsonLd?: () => object[]): void {
    this.setPageResolver(() => ({
      title: this.translateService.translate(titleKey),
      description: this.translateService.translate(descriptionKey),
      jsonLd: jsonLd?.()
    }));
  }

  /** Le resolver est réévalué à chaque navigation et à chaque changement de langue ou de données. */
  setPageResolver(resolver: SeoPageResolver): void {
    this.resolver.set(resolver);
  }

  private apply(): void {
    const path = this.currentPath();
    const data = this.resolver()?.() ?? null;
    const canonicalPath = data?.canonicalPath ?? path;
    const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;

    this.updateCanonical(canonicalUrl);
    this.updateAlternates(canonicalPath);
    this.updateJsonLd(data?.jsonLd);
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });

    if (!data) {
      return;
    }

    const fullTitle = data.title.includes(SITE_NAME) ? data.title : `${data.title} | ${SITE_NAME}`;
    const description = this.truncate(data.description);
    const image = data.image ?? DEFAULT_IMAGE;

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: data.noindex ? 'noindex, follow' : 'index, follow' });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }

  private truncate(description: string): string {
    const clean = description.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    if (clean.length <= MAX_DESCRIPTION_LENGTH) {
      return clean;
    }

    const cut = clean.slice(0, MAX_DESCRIPTION_LENGTH);
    return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
  }

  private updateJsonLd(graph?: object[]): void {
    const head = this.document.head;
    head.querySelectorAll('script[data-seo-jsonld]').forEach(script => script.remove());

    if (!graph?.length) {
      return;
    }

    const script = this.document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('data-seo-jsonld', '');
    // `<` est échappé pour qu'une donnée issue du CMS ne puisse pas refermer la balise script
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
      .replace(/</g, '\\u003c');
    head.appendChild(script);
  }

  private updateAlternates(path: string): void {
    const head = this.document.head;
    head.querySelectorAll('link[rel="alternate"][data-seo-alternate]').forEach(link => link.remove());

    if (!LANG_PREFIX_PATTERN.test(path)) {
      return;
    }

    ALTERNATES.forEach(({ hreflang, lang }) => {
      const link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', hreflang);
      link.setAttribute('href', `${SITE_ORIGIN}${path.replace(LANG_PREFIX_PATTERN, `/${lang}-ch`)}`);
      link.setAttribute('data-seo-alternate', '');
      head.appendChild(link);
    });
  }

  private updateCanonical(href: string): void {
    let link = this.document.querySelector<HTMLLinkElement>("link[rel='canonical']");

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', href);
  }
}
