import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { switchMap, map, combineLatest } from 'rxjs';
import { ApiService } from '@core/services/api.service';
import { ContactFormComponent } from '@shared/components/contact-form/contact-form.component';

@Component({
  selector: 'app-artwork-detail',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    LazyLoadImageModule
  ],
  templateUrl: './artwork-detail.component.html',
  styleUrl: './artwork-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworkDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  private readonly dialog = inject(MatDialog);

  readonly artworkId$ = this.route.params.pipe(
    map(params => +params['id'])
  );

  readonly artwork$ = this.artworkId$.pipe(
    switchMap(id => this.apiService.getArtworkById(id))
  );

  readonly relatedArtworks$ = this.artwork$.pipe(
    switchMap(artwork => this.apiService.getArtworksByCategory(artwork.categoryId)),
    map(artworks => artworks.filter(a => a.id !== this.artworkId()).slice(0, 4))
  );

  private artworkId(): number {
    return +this.route.snapshot.params['id'];
  }

  onContactInterest(): void {
    this.dialog.open(ContactFormComponent, {
      width: '600px',
      data: {
        subject: `IntÃ©rÃªt pour l'Å"uvre #${this.artworkId()}`,
        artworkId: this.artworkId()
      }
    });
  }

  onRelatedArtworkClick(artworkId: number): void {
    this.router.navigate(['/artworks/detail', artworkId]);
  }

  onCategoryClick(categorySlug: string): void {
    this.router.navigate(['/artworks', categorySlug]);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  }
}
