import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, ViewChild, ElementRef, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { ArtworkService } from '@features/artworks/services/artwork.service';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';
import { VideoService } from '@shared/services/video.service';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {NavService} from '@core/services/nav.service';
import {TruncatePipe} from '@core/pipes/truncate.pipe';
import {LocaleService} from '@core/services/locale.service';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    LazyLoadImageModule,
    TranslatePipe,
    TruncatePipe
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly artworkService = inject(ArtworkService);
  private readonly scrollAnimationService = inject(ScrollAnimationService);
  private readonly videoService = inject(VideoService);
  protected readonly navService = inject(NavService);
  protected readonly localeService = inject(LocaleService);
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('heroVideo', { static: false }) heroVideo!: ElementRef<HTMLVideoElement>;

  readonly categories$ = this.artworkService.getCategories();
  readonly videoConfig = this.videoService.videos['home'];

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.scrollAnimationService.setupScrollAnimations();
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId) && this.heroVideo) {
      const video = this.heroVideo.nativeElement;
      this.videoService.setupVideo(video, 'home');

      video.addEventListener('canplay', () => {
        video.classList.add('video-loaded');
      }, { once: true });
    }
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
}
