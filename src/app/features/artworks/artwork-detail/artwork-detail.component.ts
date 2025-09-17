import { Component, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { ApiService } from '@core/services/api.service';
import { switchMap, combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-artwork-detail',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    LazyLoadImageModule
  ],
  templateUrl: './artwork-detail.component.html',
  styleUrl: './artwork-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworkDetailComponent {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly selectedImageIndex = signal(0);

  readonly artwork$ = this.route.params.pipe(
    switchMap(params => this.apiService.getArtworkById(+params['id']))
  );

  readonly relatedArtworks$ = combineLatest([
    this.artwork$,
    this.apiService.getAvailableArtworks()
  ]).pipe(
    map(([artwork, allArtworks]) => {
      if (!artwork || !artwork.categoryIds || artwork.categoryIds.size === 0) return [];

      // Trouve les œuvres qui partagent au moins une catégorie
      return allArtworks
        .filter(a =>
          a.categoryIds &&
          a.id !== artwork.id &&
          this.hasCommonCategory(a.categoryIds, artwork.categoryIds)
        )
        .slice(0, 4);
    })
  );

  readonly categories$ = combineLatest([
    this.artwork$,
    this.apiService.getArtworkCategories()
  ]).pipe(
    map(([artwork, allCategories]) => {
      if (!artwork || !artwork.categoryIds || artwork.categoryIds.size === 0) return [];

      return allCategories.filter(category =>
        artwork.categoryIds!.has(category.id)
      );
    })
  );

  // Computed pour récupérer la première catégorie (pour la navigation)
  readonly primaryCategory$ = this.categories$.pipe(
    map(categories => categories.length > 0 ? categories[0] : null)
  );

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  private hasCommonCategory(categoryIds1: Set<number>, categoryIds2: Set<number>): boolean {
    for (const id of categoryIds1) {
      if (categoryIds2.has(id)) {
        return true;
      }
    }
    return false;
  }
}
