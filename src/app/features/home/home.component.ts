import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { ArtworkService } from '@features/artworks/services/artwork.service';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    LazyLoadImageModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly artworkService = inject(ArtworkService);
  private readonly router = inject(Router);

  readonly categories$ = this.artworkService.getCategories();

  onCategoryClick(categorySlug: string): void {
    this.router.navigate(['/artworks', categorySlug]);
  }

  getCategoryThumbnail(category: any): string {
    return category.thumbnailUrl || category.mainImageUrl || '/assets/images/placeholder.jpg';
  }
}
