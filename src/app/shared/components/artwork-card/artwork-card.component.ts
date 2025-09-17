import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { Artwork } from '@core/models/artwork.model';

@Component({
  selector: 'app-artwork-card',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    LazyLoadImageModule
  ],
  templateUrl: './artwork-card.component.html',
  styleUrl: './artwork-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworkCardComponent {
  readonly artwork = input.required<Artwork>();
  readonly cardClick = output<number>();

  onCardClick(): void {
    this.cardClick.emit(this.artwork().id);
  }

  getCategoryNamesArray(artwork: Artwork): string[] {
    if (!artwork.categoryNames || artwork.categoryNames.size === 0) {
      return [];
    }
    return Array.from(artwork.categoryNames);
  }

  getMainImage(artwork: Artwork): string {
    if (artwork.mainImageUrl) {
      return artwork.mainImageUrl;
    }
    if (artwork.imageUrls && artwork.imageUrls.length > 0) {
      return artwork.imageUrls[0];
    }
    return '/assets/images/placeholder.jpg';
  }
}
