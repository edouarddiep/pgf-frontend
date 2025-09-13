import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
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
      if (!artwork) return [];
      return allArtworks
        .filter(a => a.categoryId === artwork.categoryId && a.id !== artwork.id)
        .slice(0, 4);
    })
  );

  readonly category$ = this.artwork$.pipe(
    switchMap(artwork => {
      if (!artwork) return [];
      return this.apiService.getArtworkCategories().pipe(
        map(categories => categories.find(c => c.id === artwork.categoryId))
      );
    })
  );

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }
}
