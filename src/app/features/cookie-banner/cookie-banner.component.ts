import { Component, inject, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConsentService } from '@core/services/consent.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { TranslateService } from '@core/services/translate.service';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [RouterModule, TranslatePipe],
  templateUrl: './cookie-banner.component.html',
  styleUrl: './cookie-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CookieBannerComponent {
  protected readonly consentService = inject(ConsentService);
  private readonly translateService = inject(TranslateService);

  protected readonly analyticsToggle = signal(false);

  protected readonly privacyUrl = computed(() =>
    `/${this.translateService.currentLang()}-ch/privacy`
  );

  protected readonly showBanner = computed(() =>
    this.consentService.resolved() && this.consentService.consentGiven() === null
  );

  protected readonly showSettings = this.consentService.showSettings;

  openSettings(): void {
    this.analyticsToggle.set(this.consentService.analyticsEnabled());
    this.consentService.openSettings();
  }

  saveSettings(): void {
    this.consentService.saveCustom(this.analyticsToggle());
  }

  toggleAnalytics(): void {
    this.analyticsToggle.update(v => !v);
  }
}
