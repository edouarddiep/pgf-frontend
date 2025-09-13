import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { ApiService } from '@core/services/api.service';
import { Artwork } from '@core/models/artwork.model';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    LazyLoadImageModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);

  readonly featuredArtworks$ = this.apiService.getAvailableArtworks();
  readonly categories$ = this.apiService.getArtworkCategories();

  onArtworkClick(artwork: Artwork): void {
    this.router.navigate(['/artworks/detail', artwork.id]);
  }

  onCategoryClick(categorySlug: string): void {
    this.router.navigate(['/artworks', categorySlug]);
  }

  getMainImage(artwork: Artwork): string {
    return artwork.imageUrls?.[0] || 'public/assets/images/placeholder.jpg';
  }

  getCategoryImage(categorySlug: string): string {
    return 'public/assets/images/placeholder.jpg';
  }
}
