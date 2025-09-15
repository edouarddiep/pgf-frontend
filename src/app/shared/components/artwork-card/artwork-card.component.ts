import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { Artwork } from '@core/models/artwork.model';

@Component({
  selector: 'app-artwork-card',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    LazyLoadImageModule
  ],
  templateUrl: './artwork-card.component.html',
  styleUrl: './artwork-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworkCardComponent {
  readonly artwork = input.required<Artwork>();
  readonly artworkClick = output<Artwork>();

  getMainImage(artwork: Artwork): string {
    return artwork.imageUrls?.[0] || '/assets/images/placeholder.jpg';
  }

  onCardClick(): void {
    this.artworkClick.emit(this.artwork());
  }
}
