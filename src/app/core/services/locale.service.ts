import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@core/services/translate.service';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly translateService = inject(TranslateService);

  resolve(entity: object, field: string): string {
    const lang = this.translateService.currentLang();
    const obj = entity as Record<string, unknown>;
    if (lang === 'en') {
      const enValue = obj[`${field}En`];
      if (typeof enValue === 'string' && enValue) return enValue;
    }
    const value = obj[field];
    return typeof value === 'string' ? value : '';
  }
}
