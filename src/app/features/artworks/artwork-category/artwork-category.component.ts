import { Component, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import {switchMap, map, combineLatest, take} from 'rxjs';
import { ApiService } from '@core/services/api.service';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {TruncatePipe} from '@core/pipes/truncate.pipe';

@Component({
  selector: 'app-artwork-category',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    LazyLoadImageModule,
    TranslatePipe,
    TruncatePipe
  ],
  templateUrl: './artwork-category.component.html',
  styleUrl: './artwork-category.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworkCategoryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly apiService = inject(ApiService);
  private readonly scrollAnimationService = inject(ScrollAnimationService);

  private readonly SCROLL_KEY = 'artworks';
  private readonly SCROLL_KEY_CATEGORIES = 'artwork-categories';

  readonly slug$ = this.route.params.pipe(
    map(params => params['category'])
  );

  readonly category$ = this.slug$.pipe(
    switchMap(slug => this.apiService.getCategoryBySlug(slug))
  );

  readonly artworks$ = this.slug$.pipe(
    switchMap(slug => this.apiService.getArtworksByCategorySlug(slug))
  );

  readonly viewModel$ = combineLatest([
    this.category$,
    this.artworks$
  ]).pipe(
    map(([category, artworks]) => ({ category, artworks }))
  );

  ngOnInit(): void {
    this.scrollAnimationService.restoreScrollPosition(this.SCROLL_KEY);
  }

  onArtworkClick(artworkId: number): void {
    this.scrollAnimationService.saveScrollPosition(this.SCROLL_KEY);
    this.slug$.pipe(take(1)).subscribe(slug => {
      this.router.navigate(['/artworks', artworkId],
        { queryParams:
            { from: slug }
        });
    });
  }

  onAllCategoriesClick(): void {
    if (this.scrollAnimationService.hasScrollPosition(this.SCROLL_KEY_CATEGORIES)) {
      this.location.back();
    } else {
      this.router.navigate(['/artworks']);
    }
  }
}
