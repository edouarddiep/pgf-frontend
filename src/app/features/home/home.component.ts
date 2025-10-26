import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, ViewChild, ElementRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { ArtworkService } from '@features/artworks/services/artwork.service';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    LazyLoadImageModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly artworkService = inject(ArtworkService);
  private readonly router = inject(Router);
  private readonly scrollAnimationService = inject(ScrollAnimationService);
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('heroVideo', { static: true }) heroVideo!: ElementRef<HTMLVideoElement>;

  readonly categories$ = this.artworkService.getCategories();

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.ensureVideoPlays();
      this.setupVideoLoop();
      this.scrollAnimationService.setupScrollAnimations();
    }
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }

  private ensureVideoPlays(): void {
    setTimeout(() => {
      const video = this.heroVideo?.nativeElement;
      if (video && typeof video.play === 'function') {
        // Force le mute avant de jouer
        video.muted = true;
        video.volume = 0;
        video.currentTime = 2;
        video.play().catch(() => {
          // Fallback silencieux si l'autoplay échoue
        });
      }
    }, 500);
  }

  private setupVideoLoop(): void {
    setTimeout(() => {
      const video = this.heroVideo?.nativeElement;
      if (video && typeof video.addEventListener === 'function') {
        video.muted = true;
        video.volume = 0;

        video.addEventListener('loadedmetadata', () => {
          video.currentTime = 2;
          video.muted = true;
          video.volume = 0;
        });

        video.addEventListener('timeupdate', () => {
          if (video.currentTime >= 25) {
            video.currentTime = 2;
          }
        });

        // Empêcher la réactivation du son
        video.addEventListener('volumechange', () => {
          if (!video.muted || video.volume > 0) {
            video.muted = true;
            video.volume = 0;
          }
        });
      }
    }, 500);
  }

  onCategoryClick(categorySlug: string): void {
    this.router.navigate(['/artworks', categorySlug]);
  }

  getCategoryThumbnail(category: any): string {
    return category.thumbnailUrl || category.mainImageUrl || '/assets/images/placeholder.jpg';
  }
}
