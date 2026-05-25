import {effect, inject, Injectable, PLATFORM_ID} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { TranslateService } from '@core/services/translate.service';
import {isPlatformBrowser} from '@angular/common';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translateService = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  private currentTitleKey = '';
  private currentDescKey = '';

  constructor() {
    effect(() => {
      this.translateService.currentLang();
      if (this.currentTitleKey) {
        this.applyTags();
      }
    });
    this.updateCanonical();
  }

  setPage(titleKey: string, descriptionKey: string): void {
    this.currentTitleKey = titleKey;
    this.currentDescKey = descriptionKey;
    this.applyTags();
  }

  private applyTags(): void {
    const translatedTitle = this.translateService.translate(this.currentTitleKey);
    const translatedDesc = this.translateService.translate(this.currentDescKey);
    const fullTitle = `${translatedTitle} | Pierrette Gonseth-Favre`;

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: translatedDesc });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: translatedDesc });
    this.updateCanonical();
  }

  private updateCanonical(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', `https://www.pierrette-gonsethfavre.ch${window.location.pathname}`);
  }
}
