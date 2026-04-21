import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { ArtworkService } from '@features/artworks/services/artwork.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { TranslateService } from '@core/services/translate.service';
import { LocaleService } from '@core/services/locale.service';

@Component({
  selector: 'app-footer',
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatDividerModule, TranslatePipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {
  private readonly artworkService = inject(ArtworkService);
  private readonly translateService = inject(TranslateService);
  protected readonly localeService = inject(LocaleService);
  protected readonly lang = computed(() => this.translateService.currentLang());

  readonly categories$ = this.artworkService.getCategories();
  readonly currentYear = new Date().getFullYear();
  readonly instagramUrl = 'https://www.instagram.com/pierrette_gf?igsh=azh0bGV6ZzltMzdj&utm_source=qr';
  readonly instagramLogoUrl = 'https://bhjpavcxhymxcadesnqy.supabase.co/storage/v1/object/public/oeuvres/yaya/images/insta-logo.jpg';

  readonly quickLinks = [
    { nameKey: 'nav.home', route: '/' },
    { nameKey: 'nav.about', route: '/about' },
    { nameKey: 'nav.artworks', route: '/artworks' },
    { nameKey: 'nav.exhibitions', route: '/exhibitions' },
    { nameKey: 'nav.archives', route: '/archives' },
    { nameKey: 'nav.association', route: '/association' },
    { nameKey: 'nav.contact', route: '/contact' }
  ];

  readonly legalLinks = [
    { nameKey: 'footer.legal', route: '/legal' },
    { nameKey: 'footer.privacy', route: '/privacy' },
    { nameKey: 'footer.terms', route: '/terms' }
  ];
}
