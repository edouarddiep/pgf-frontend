import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { ArtworkService } from '@features/artworks/services/artwork.service';

@Component({
  selector: 'app-footer',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule
  ],
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
    { name: 'Accueil', route: '/' },
    { name: 'A propos', route: '/about' },
    { name: 'Œuvres', route: '/artworks' },
    { name: 'Expositions', route: '/exhibitions' },
    { name: 'Archives', route: '/archives' },
    { name: 'Association', route: '/association' },
    { name: 'Contact', route: '/contact' }
  ];

  readonly legalLinks = [
    { name: 'Mentions légales', route: '/legal' },
    { name: 'Conditions générales', route: '/terms' }
  ];
}
