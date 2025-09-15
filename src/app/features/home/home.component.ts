import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '@core/services/api.service';
import { ArtworkCardComponent } from '@shared/components/artwork-card/artwork-card.component';
import { Artwork } from '@core/models/artwork.model';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    ArtworkCardComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);

  readonly artworks$ = this.apiService.getAvailableArtworks();

  onArtworkClick(artwork: Artwork): void {
    this.router.navigate(['/artworks/detail', artwork.id]);
  }
}
