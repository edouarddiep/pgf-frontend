import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import {ArtworkService} from '@features/artworks/services/artwork.service';

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

  readonly socialLinks = [
    { name: 'Facebook', icon: 'facebook', url: '#' },
    { name: 'Instagram', icon: 'instagram', url: '#' },
    { name: 'Twitter', icon: 'twitter', url: '#' },
    { name: 'Email', icon: 'mail', url: 'mailto:contact@pgf-art.fr' }
  ];

  readonly quickLinks = [
    { name: 'Accueil', route: '/' },
    { name: 'A propos', route: '/about' },
    { name: 'Oeuvres', route: '/artworks' },
    { name: 'Expositions', route: '/exhibitions' },
    { name: 'Contact', route: '/contact' }
  ];

  readonly legalLinks = [
    { name: 'Mentions légales', route: '/legal' },
    { name: 'Politique de confidentialité', route: '/privacy' },
    { name: 'Conditions générales', route: '/terms' }
  ];
}
