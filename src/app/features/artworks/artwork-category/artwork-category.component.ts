import {Component, inject, ChangeDetectionStrategy, OnInit, computed} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import {switchMap, map, combineLatest, take} from 'rxjs';
import { ApiService } from '@core/services/api.service';
import { SeoService } from '@core/services/seo.service';
import { artistRefSchema, breadcrumbSchema, collectionSchema, SITE_ORIGIN, websiteSchema } from '@core/seo/structured-data';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {TruncatePipe} from '@core/pipes/truncate.pipe';
import {TranslateService} from '@core/services/translate.service';
import {LocaleService} from '@core/services/locale.service';
import {NavService} from '@core/services/nav.service';

@Component({
  selector: 'app-artwork-category',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    TruncatePipe
  ],
  templateUrl: './artwork-category.component.html',
  styleUrl: './artwork-category.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworkCategoryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly apiService = inject(ApiService);
  private readonly scrollAnimationService = inject(ScrollAnimationService);
  private readonly translateService = inject(TranslateService);
  protected readonly localeService = inject(LocaleService);
  protected readonly navService = inject(NavService);
  private readonly seoService = inject(SeoService);
  protected readonly lang = computed(() => this.translateService.currentLang());

  private readonly SCROLL_KEY = 'artworks';
  private readonly SCROLL_KEY_CATEGORIES = 'artwork-categories';

  readonly slug$ = this.route.params.pipe(
    map(params => params['category'])
  );

  readonly category$ = this.slug$.pipe(
    switchMap(slug => this.apiService.getCategoryBySlug(slug))
  );

  readonly artworks$ = this.slug$.pipe(
    switchMap(slug => this.apiService.getArtworksByCategorySlug(slug))
  );

  readonly viewModel$ = combineLatest([
    this.category$,
    this.artworks$
  ]).pipe(
    map(([category, artworks]) => ({ category, artworks }))
  );

  protected readonly viewModel = toSignal(this.viewModel$);

  ngOnInit(): void {
    this.scrollAnimationService.restoreScrollPosition(this.SCROLL_KEY);
    this.seoService.setPageResolver(() => {
      const category = this.viewModel()?.category;

      if (!category) {
        return null;
      }

      const name = this.localeService.resolve(category, 'name');
      const description = this.localeService.resolve(category, 'description');
      const langPrefix = this.navService.langPrefix();
      const path = `${langPrefix}/artworks/${category.slug}`;
      const seoDescription = description
        || this.translateService.translate('seo.artworkCategory.description', { category: name });

      return {
        title: this.translateService.translate('seo.artworkCategory.title', { category: name }),
        description: seoDescription,
        image: category.thumbnailUrl,
        jsonLd: [
          artistRefSchema(this.translateService.currentLang()),
          websiteSchema(this.translateService.currentLang()),
          collectionSchema(category, this.viewModel()?.artworks ?? [], name, seoDescription, `${SITE_ORIGIN}${path}`),
          breadcrumbSchema([
            { name: this.translateService.translate('nav.home'), path: langPrefix },
            { name: this.translateService.translate('nav.artworks'), path: `${langPrefix}/artworks` },
            { name, path }
          ])
        ]
      };
    });
  }

  onArtworkClick(artworkId: number): void {
    this.scrollAnimationService.saveScrollPosition(this.SCROLL_KEY);
    this.slug$.pipe(take(1)).subscribe(slug => {
      this.navService.navigate(['artworks', slug, artworkId]);
    });
  }

  onAllCategoriesClick(): void {
    this.navService.navigate(['artworks']);
  }

  protected onImageLoaded(event: Event): void {
    (event.target as HTMLImageElement).classList.add('loaded');
  }
}
