import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { Artwork } from '@core/models/artwork.model';

@Component({
  selector: 'app-artwork-gallery',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    LazyLoadImageModule
  ],
  templateUrl: './artwork-gallery.component.html',
  styleUrl: './artwork-gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworkGalleryComponent {
  readonly artworks = input.required<Artwork[]>();
  readonly artworkSelected = output<Artwork>();

  onArtworkClick(artwork: Artwork): void {
    this.artworkSelected.emit(artwork);
  }
}
