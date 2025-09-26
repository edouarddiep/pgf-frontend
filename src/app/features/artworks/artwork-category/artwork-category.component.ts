import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { switchMap, map, combineLatest } from 'rxjs';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-artwork-category',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    LazyLoadImageModule
  ],
  templateUrl: './artwork-category.component.html',
  styleUrl: './artwork-category.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworkCategoryComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);

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

  onArtworkClick(artworkId: number): void {
    this.router.navigate(['/artworks/detail', artworkId]);
  }
}
