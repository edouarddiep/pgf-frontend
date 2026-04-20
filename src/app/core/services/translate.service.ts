import { Injectable, signal, computed } from '@angular/core';
import { translations, Lang } from '@core/i18n/translations';

@Injectable({ providedIn: 'root' })
export class TranslateService {
  readonly currentLang = signal<Lang>('fr');

  private readonly dict = computed(() => translations[this.currentLang()]);

  translate(key: string, params?: Record<string, string | number>): string {
    const value = key.split('.').reduce<unknown>((obj, k) =>
        obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[k] : undefined,
      this.dict()
    );
    let result = typeof value === 'string' ? value : key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => result = result.replace(`{{${k}}}`, String(v)));
    }
    return result;
  }

  setLang(lang: Lang): void {
    this.currentLang.set(lang);
  }
}
