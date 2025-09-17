import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { ArtworkService } from '@features/artworks/services/artwork.service';
import { ArtworkCategory } from '@core/models/artwork.model';
import { switchMap, map, combineLatest } from 'rxjs';

@Component({
  selector: 'app-artworks',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    LazyLoadImageModule
  ],
  templateUrl: './artworks.component.html',
  styleUrl: './artworks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworksComponent {
  private readonly artworkService = inject(ArtworkService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly categorySlug$ = this.route.params.pipe(
    map(params => params['category'])
  );

  readonly categories$ = this.artworkService.getCategories();

  readonly filteredArtworks$ = combineLatest([
    this.categorySlug$,
    this.artworkService.getAvailableArtworks()
  ]).pipe(
    map(([categorySlug, artworks]) => {
      if (!categorySlug) return artworks;

      // Filtre les œuvres qui appartiennent à la catégorie (Many-to-Many)
      return artworks.filter(artwork =>
        artwork.categorySlugs && artwork.categorySlugs.has(categorySlug)
      );
    })
  );

  readonly currentCategory$ = combineLatest([
    this.categorySlug$,
    this.categories$
  ]).pipe(
    map(([categorySlug, categories]) => {
      return categories.find(cat => cat.slug === categorySlug);
    })
  );

  onArtworkClick(artworkId: number): void {
    this.router.navigate(['/artworks/detail', artworkId]);
  }

  getCategoryImage(category: ArtworkCategory): string {
    // Recherche dans toutes les œuvres disponibles pour cette catégorie
    // Note: Cette logique pourrait être optimisée avec un service dédié
    return '/assets/images/placeholder.jpg';
  }

  getPlaceholderImage(): string {
    return '/assets/images/placeholder.jpg';
  }
}
