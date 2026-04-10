import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { ArtworkService } from '@features/artworks/services/artwork.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';

@Component({
  selector: 'app-footer',
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatDividerModule, TranslatePipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {
  private readonly artworkService = inject(ArtworkService);

  readonly categories$ = this.artworkService.getCategories();
  readonly currentYear = new Date().getFullYear();
  readonly instagramUrl = 'https://www.instagram.com/pierrette_gf?igsh=azh0bGV6ZzltMzdj&utm_source=qr';
  readonly instagramLogoUrl = 'https://bhjpavcxhymxcadesnqy.supabase.co/storage/v1/object/public/oeuvres/yaya/images/insta-logo.jpg';

  readonly quickLinks = [
    { key: 'nav.home', route: '/' },
    { key: 'nav.about', route: '/about' },
    { key: 'nav.artworks', route: '/artworks' },
    { key: 'nav.exhibitions', route: '/exhibitions' },
    { key: 'nav.archives', route: '/archives' },
    { key: 'nav.association', route: '/association' },
    { key: 'nav.contact', route: '/contact' }
  ];

  readonly legalLinks = [
    { key: 'footer.legal', route: '/legal' },
    { key: 'footer.privacy', route: '/privacy' },
    { key: 'footer.terms', route: '/terms' }
  ];
}
