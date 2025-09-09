import {Component, inject, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule, Router} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {LazyLoadImageModule} from 'ng-lazyload-image';
import {ArtworkGalleryComponent} from '@shared/components/artwork-gallery/artwork-gallery.component';
import {Artwork as ArtworkModel} from '@core/models/artwork.model';
import {map} from 'rxjs';
import {ApiService} from '@core/services/api.service';
import {ArtworkService} from '@features/artworks/services/artwork.service';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    LazyLoadImageModule,
    ArtworkGalleryComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly artworkService = inject(ArtworkService);
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);

  readonly categories$ = this.artworkService.getCategories();

  readonly featuredArtworks$ = this.artworkService.getAvailableArtworks().pipe(
    map(artworks => artworks.slice(0, 6))
  );

  readonly nextExhibition$ = this.apiService.getNextFeaturedExhibition();

  onArtworkSelected(artwork: ArtworkModel): void {
    this.router.navigate(['/artworks/detail', artwork.id]);
  }
}
