import {Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject} from '@angular/core';

import { ScrollAnimationService } from '@shared/services/scroll-animation.service';
import { SeoService } from '@core/services/seo.service';
import {TranslatePipe} from '@core/pipes/translate.pipe';

@Component({
  selector: 'app-privacy',
  imports: [TranslatePipe],
  templateUrl: './privacy.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrivacyComponent implements OnInit, OnDestroy {
  private readonly scrollAnimationService = inject(ScrollAnimationService);
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.setPage('seo.privacy.title', 'seo.privacy.description');
    this.scrollAnimationService.setupScrollAnimations();
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }
}
