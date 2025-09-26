import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { ArtworkService } from '@features/artworks/services/artwork.service';
import { switchMap, combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-artwork-detail',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    LazyLoadImageModule
  ],
  templateUrl: './artwork-detail.component.html',
  styleUrl: './artwork-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworkDetailComponent {
  private readonly artworkService = inject(ArtworkService);
  private readonly route = inject(ActivatedRoute);

  readonly selectedImageIndex = signal(0);
  readonly showImageModal = signal(false);
  readonly modalImageIndex = signal(0);

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

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  previousImage(): void {
    const current = this.selectedImageIndex();
    if (current > 0) {
      this.selectedImageIndex.set(current - 1);
    }
  }

  nextImage(): void {
    this.selectedImageIndex.set(this.selectedImageIndex() + 1);
  }

  openImageModal(index: number): void {
    this.modalImageIndex.set(index);
    this.showImageModal.set(true);
  }

  closeImageModal(): void {
    this.showImageModal.set(false);
  }

  previousModalImage(): void {
    const current = this.modalImageIndex();
    if (current > 0) {
      this.modalImageIndex.set(current - 1);
    }
  }

  nextModalImage(): void {
    this.modalImageIndex.set(this.modalImageIndex() + 1);
  }

  scrollThumbnails(direction: 'left' | 'right'): void {
    const container = document.querySelector('.thumbnails-container') as HTMLElement;
    if (container) {
      const scrollAmount = 120;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }
}
