import { Component, inject, ChangeDetectionStrategy, signal, viewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ArtworkService } from '@features/artworks/services/artwork.service';
import { switchMap, combineLatest, map, take } from 'rxjs';

@Component({
  selector: 'app-artwork-detail',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './artwork-detail.component.html',
  styleUrl: './artwork-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworkDetailComponent implements AfterViewInit {
  private readonly artworkService = inject(ArtworkService);
  private readonly route = inject(ActivatedRoute);

  readonly mainImageContainer = viewChild<ElementRef<HTMLElement>>('mainImageContainer');
  readonly thumbnailsContainer = viewChild<ElementRef<HTMLElement>>('thumbnailsContainer');
  readonly selectedImageIndex = signal(0);
  readonly showImageModal = signal(false);
  readonly modalImageIndex = signal(0);

  private touchStartX = 0;
  private touchEndX = 0;
  private totalImages = 0;

  readonly artwork$ = this.route.params.pipe(
    switchMap(params => this.artworkService.getArtworkById(+params['id']))
  );

  readonly categories$ = this.artworkService.getCategories();

  readonly primaryCategory$ = combineLatest([
    this.artwork$,
    this.categories$
  ]).pipe(
    map(([artwork, allCategories]) => {
      if (!artwork || !allCategories.length) return null;

      if (artwork.categoryIds && artwork.categoryIds.length > 0) {
        const categoryId = artwork.categoryIds[0];
        return allCategories.find(category => category.id === categoryId) || null;
      }

      if (artwork.categorySlugs && artwork.categorySlugs.length > 0) {
        const categorySlug = artwork.categorySlugs[0];
        return allCategories.find(category => category.slug === categorySlug) || null;
      }

      return null;
    })
  );

  ngAfterViewInit(): void {
    this.artwork$.pipe(take(1)).subscribe(artwork => {
      if (artwork?.imageUrls) {
        this.totalImages = artwork.imageUrls.length;
        this.setupTouchListeners();
      }
    });
  }

  private setupTouchListeners(): void {
    const container = this.mainImageContainer()?.nativeElement;
    if (!container) return;

    container.addEventListener('touchstart', (e) => {
      this.touchStartX = e.touches[0].clientX;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      this.touchEndX = e.changedTouches[0].clientX;
      this.handleSwipe();
    }, { passive: true });
  }

  private handleSwipe(): void {
    const swipeThreshold = 50;
    const diff = this.touchStartX - this.touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        this.nextImage(this.totalImages);
      } else {
        this.previousImage(this.totalImages);
      }
    }
  }

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
    this.centerThumbnail(index);
  }

  previousImage(totalImages: number): void {
    const current = this.selectedImageIndex();
    const newIndex = current > 0 ? current - 1 : totalImages - 1;
    this.selectImage(newIndex);
  }

  nextImage(totalImages: number): void {
    const current = this.selectedImageIndex();
    const newIndex = current < totalImages - 1 ? current + 1 : 0;
    this.selectImage(newIndex);
  }

  openImageModal(index: number): void {
    this.modalImageIndex.set(index);
    this.showImageModal.set(true);
  }

  closeImageModal(): void {
    this.showImageModal.set(false);
  }

  previousModalImage(event: Event, totalImages: number): void {
    event.stopPropagation();
    const current = this.modalImageIndex();
    const newIndex = current > 0 ? current - 1 : totalImages - 1;
    this.modalImageIndex.set(newIndex);
  }

  nextModalImage(event: Event, totalImages: number): void {
    event.stopPropagation();
    const current = this.modalImageIndex();
    const newIndex = current < totalImages - 1 ? current + 1 : 0;
    this.modalImageIndex.set(newIndex);
  }

  private centerThumbnail(index: number): void {
    requestAnimationFrame(() => {
      const container = this.thumbnailsContainer()?.nativeElement;
      if (!container) return;

      const thumbnails = Array.from(container.children) as HTMLElement[];
      const thumbnail = thumbnails[index];

      if (!thumbnail) return;

      const containerRect = container.getBoundingClientRect();
      const thumbnailRect = thumbnail.getBoundingClientRect();

      const containerCenter = containerRect.width / 2;
      const thumbnailCenter = thumbnailRect.left - containerRect.left + thumbnailRect.width / 2;
      const scrollOffset = thumbnailCenter - containerCenter;

      container.scrollBy({
        left: scrollOffset,
        behavior: 'smooth'
      });
    });
  }
}
