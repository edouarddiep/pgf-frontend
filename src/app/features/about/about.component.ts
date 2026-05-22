import { Component, inject, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { NavService } from '@core/services/nav.service';
import {SeoService} from '@core/services/seo.service';

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

  ngOnInit(): void {
    this.seoService.setPage('seo.about.title', 'seo.about.description');
    this.scrollAnimationService.setupScrollAnimations();
    this.setupBibliographyAnimations();
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }

  private setupBibliographyAnimations(): void {
    setTimeout(() => {
      const timelineItems = document.querySelectorAll('.bibliography-timeline .timeline-item');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -100px 0px' });

      timelineItems.forEach(item => observer.observe(item));
    }, 100);
  }
}
