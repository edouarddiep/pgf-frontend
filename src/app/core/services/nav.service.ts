import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@core/services/translate.service';

@Injectable({ providedIn: 'root' })
export class NavService {
  private readonly translateService = inject(TranslateService);
  private readonly router = inject(Router);

  readonly langPrefix = computed(() => `/${this.translateService.currentLang()}-ch`);

  navigate(segments: (string | number)[]): Promise<boolean> {
    const [first, ...rest] = segments;
    return this.router.navigate([`${this.langPrefix()}/${first}`, ...rest]);
  }

  navigateHome(): Promise<boolean> {
    return this.router.navigate([this.langPrefix()]);
  }
}
