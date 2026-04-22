import {ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, RouterModule} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {LazyLoadImageModule} from 'ng-lazyload-image';
import {ArtworkService} from '@features/artworks/services/artwork.service';
import {ArtworkCardComponent} from '@shared/components/artwork-card/artwork-card.component';
import {ScrollAnimationService} from '@shared/services/scroll-animation.service';
import {combineLatest, map, take} from 'rxjs';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {TruncatePipe} from '@core/pipes/truncate.pipe';
import {TranslateService} from '@core/services/translate.service';
import {LocaleService} from '@core/services/locale.service';
import {NavService} from '@core/services/nav.service';

@Component({
  selector: 'app-artworks',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    LazyLoadImageModule,
    ArtworkCardComponent,
    TranslatePipe,
    TruncatePipe
  ],
  templateUrl: './artworks.component.html',
  styleUrl: './artworks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworksComponent implements OnInit, OnDestroy {
  private readonly artworkService = inject(ArtworkService);
  private readonly route = inject(ActivatedRoute);
  private readonly scrollAnimationService = inject(ScrollAnimationService);
  private readonly translateService = inject(TranslateService);
  protected readonly localeService = inject(LocaleService);
  private readonly navService = inject(NavService);
  protected readonly lang = computed(() => this.translateService.currentLang());

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
    const categorySlug = this.route.snapshot.params['category'];
    if (categorySlug) {
      this.navService.navigate(['artworks', categorySlug, artworkId]);
    } else {
      this.navService.navigate(['artworks', artworkId]);
    }
  }

  onCategoryClick(categorySlug: string): void {
    this.scrollAnimationService.saveScrollPosition(this.SCROLL_KEY_CATEGORIES);
    this.navService.navigate(['artworks', categorySlug]);
  }

  getCategoryThumbnail(category: any): string {
    return category.thumbnailUrl || category.mainImageUrl;
  }
}
