import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { ArtworkService } from '@features/artworks/services/artwork.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-artworks',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    LazyLoadImageModule
  ],
  templateUrl: './artworks.component.html',
  styleUrl: './artworks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworksComponent {
  private readonly artworkService = inject(ArtworkService);
  private readonly router = inject(Router);

  readonly categories$ = this.artworkService.getCategories();
  readonly recentArtworks$ = this.artworkService.getAvailableArtworks().pipe(
    map(artworks => artworks.slice(0, 8))
  );

  onArtworkClick(artworkId: number): void {
    this.router.navigate(['/artworks/detail', artworkId]);
  }

  getCategoryImage(slug: string): string | null {
    const images: Record<string, string> = {
      'fils-de-fer': 'assets/images/categories/fils-de-fer.jpg',
      'toile-de-jute': 'assets/images/categories/toile-de-jute.jpg',
      'peinture': 'assets/images/categories/peinture.jpg',
      'sculpture': 'assets/images/categories/sculpture.jpg',
      'ecriture': 'assets/images/categories/ecriture.jpg'
    };
    return images[slug] || null;
  }

  getCategoryIcon(slug: string): string {
    const icons: Record<string, string> = {
      'fils-de-fer': 'build',
      'toile-de-jute': 'texture',
      'peinture': 'palette',
      'sculpture': 'view_in_ar',
      'ecriture': 'edit'
    };
    return icons[slug] || 'image';
  }
}
