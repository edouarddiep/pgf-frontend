import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, ViewChild, ElementRef, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ArtworkService } from '@features/artworks/services/artwork.service';
import { ExhibitionService } from '@features/exhibitions/services/exhibition.service';
import { Exhibition } from '@core/models/exhibition.model';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';
import { VideoService } from '@shared/services/video.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { NavService } from '@core/services/nav.service';
import { TruncatePipe } from '@core/pipes/truncate.pipe';
import { LocaleService } from '@core/services/locale.service';
import { TranslateService } from '@core/services/translate.service';
import { map, tap } from 'rxjs';
import {SeoService} from '@core/services/seo.service';
import {artistSchema, websiteSchema} from '@core/seo/structured-data';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    TruncatePipe
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly artworkService = inject(ArtworkService);
  private readonly exhibitionService = inject(ExhibitionService);
  private readonly scrollAnimationService = inject(ScrollAnimationService);
  private readonly videoService = inject(VideoService);
  private readonly translateService = inject(TranslateService);
  protected readonly navService = inject(NavService);
  protected readonly localeService = inject(LocaleService);
  private readonly seoService = inject(SeoService);
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('heroVideo', { static: false }) heroVideo!: ElementRef<HTMLVideoElement>;

  readonly categories$ = this.artworkService.getCategories();
  readonly videoConfig = this.videoService.videos['home'];
  readonly ongoingExhibitions$ = this.exhibitionService.getOngoingExhibitions().pipe(
    map(exhibitions => [...exhibitions]
      .sort((a, b) => new Date(a.endDate ?? a.startDate ?? 0).getTime() - new Date(b.endDate ?? b.startDate ?? 0).getTime())),
    // La section n'entre dans le DOM qu'ici : l'observateur posé au démarrage
    // ne l'aurait jamais vue, et elle serait restée à opacity 0.
    tap(() => this.scrollAnimationService.setupScrollAnimations())
  );

  ngOnInit(): void {
    this.seoService.setPage('seo.home.title', 'seo.home.description', () => {
      const lang = this.translateService.currentLang();
      return [
        artistSchema(lang, this.translateService.translate('home.hero.bio')),
        websiteSchema(lang)
      ];
    });
    if (isPlatformBrowser(this.platformId)) {
      this.scrollAnimationService.setupScrollAnimations();
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.heroVideo) {
      return;
    }

    const video = this.heroVideo.nativeElement;
    this.videoService.setupVideo(video, 'home');
    video.playbackRate = 0.75;
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }

  onCategoryClick(categorySlug: string): void {
    this.navService.navigate(['artworks', categorySlug]);
  }

  getCategoryThumbnail(category: any): string {
    return category.thumbnailUrl || category.mainImageUrl;
  }

  protected getMapsUrl(exhibition: Exhibition): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(exhibition.address ?? '')}`;
  }

  formatDateBlock(startDate?: string, endDate?: string): string {
    if (!startDate) return this.translateService.translate('exhibitions.dateConfirm');
    const start = new Date(startDate);
    const startDay = start.getDate().toString().padStart(2, '0');
    const startMonth = start.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();
    const startYear = start.getFullYear();
    if (!endDate) {
      return `${startDay} ${startMonth} ${startYear}`;
    }
    const end = new Date(endDate);
    const endDay = end.getDate().toString().padStart(2, '0');
    const endMonth = end.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();
    const endYear = end.getFullYear();
    if (startYear === endYear && startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth} ${startYear}`;
    }
    if (startYear === endYear) {
      return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`;
    }
    return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
  }
}
