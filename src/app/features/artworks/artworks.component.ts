import { Component, inject, ChangeDetectionStrategy, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { ArtworkService } from '@features/artworks/services/artwork.service';
import { ArtworkCardComponent } from '@shared/components/artwork-card/artwork-card.component';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';
import { map, combineLatest, take } from 'rxjs';

@Component({
  selector: 'app-artworks',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    LazyLoadImageModule,
    ArtworkCardComponent
  ],
  templateUrl: './artworks.component.html',
  styleUrl: './artworks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworksComponent implements OnInit, OnDestroy {
  private readonly artworkService = inject(ArtworkService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly scrollAnimationService = inject(ScrollAnimationService);

  private readonly SCROLL_KEY_CATEGORIES = 'artwork-categories';

  readonly categorySlug$ = this.route.params.pipe(
    map(params => params['category'])
  );

  readonly categories$ = this.artworkService.getCategories();

  readonly filteredArtworks$ = combineLatest([
    this.categorySlug$,
    this.artworkService.getAvailableArtworks()
  ]).pipe(
    map(([categorySlug, artworks]) => {
      if (!categorySlug) return [];
      return artworks.filter(artwork =>
        artwork.categorySlugs && artwork.categorySlugs.includes(categorySlug)
      );
    })
  );

  readonly currentCategory$ = combineLatest([
    this.categorySlug$,
    this.categories$
  ]).pipe(
    map(([categorySlug, categories]) => categories.find(cat => cat.slug === categorySlug))
  );

  ngOnInit(): void {
    this.scrollAnimationService.setupScrollAnimations();
    this.categories$.pipe(take(1)).subscribe(() => {
      this.scrollAnimationService.restoreScrollPosition(this.SCROLL_KEY_CATEGORIES);
    });
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }

  onArtworkClick(artworkId: number): void {
    this.router.navigate(['/artworks/detail', artworkId]);
  }

  onCategoryClick(categorySlug: string): void {
    this.scrollAnimationService.saveScrollPosition(this.SCROLL_KEY_CATEGORIES);
    this.router.navigate(['/artworks', categorySlug]);
  }

  getCategoryThumbnail(category: any): string {
    return category.thumbnailUrl || category.mainImageUrl;
  }
}
