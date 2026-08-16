import { Component, inject, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { NavService } from '@core/services/nav.service';
import {SeoService} from '@core/services/seo.service';
import {TranslateService} from '@core/services/translate.service';
import {artistSchema, PERSON_ID, SITE_ORIGIN} from '@core/seo/structured-data';

@Component({
  selector: 'app-about',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    TranslatePipe
  ],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutComponent implements OnInit, OnDestroy {
  private readonly scrollAnimationService = inject(ScrollAnimationService);
  protected readonly navService = inject(NavService);
  private readonly seoService = inject(SeoService);
  private readonly translateService = inject(TranslateService);

  ngOnInit(): void {
    this.seoService.setPage('seo.about.title', 'seo.about.description', () => {
      const lang = this.translateService.currentLang();
      return [
        artistSchema(lang, this.translateService.translate('about.journey.bio1')),
        {
          '@type': 'ProfilePage',
          mainEntity: { '@id': PERSON_ID },
          url: `${SITE_ORIGIN}/${lang}-ch/about`
        }
      ];
    });
    this.scrollAnimationService.setupScrollAnimations();
    this.scrollAnimationService.observeElements(
      '.bibliography-timeline .timeline-item',
      { threshold: 0.2, rootMargin: '0px 0px -100px 0px' },
      100
    );
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }
}
