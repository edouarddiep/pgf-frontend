import {Component, input, output, ChangeDetectionStrategy, inject, computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { Artwork } from '@core/models/artwork.model';
import { TruncatePipe } from '@core/pipes/truncate.pipe';
import {TranslateService} from '@core/services/translate.service';
import {LocaleService} from '@core/services/locale.service';

@Component({
  selector: 'app-artwork-card',
  imports: [CommonModule, MatCardModule, MatIconModule, LazyLoadImageModule, TruncatePipe],
  templateUrl: './artwork-card.component.html',
  styleUrl: './artwork-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworkCardComponent {
  readonly artwork = input.required<Artwork>();
  readonly cardClick = output<number>();
  private readonly translateService = inject(TranslateService);
  protected readonly localeService = inject(LocaleService);
  protected readonly lang = computed(() => this.translateService.currentLang());

  onCardClick(): void {
    this.cardClick.emit(this.artwork().id);
  }

  getCategorySlugsArray(artwork: Artwork): string[] {
    if (!artwork.categorySlugs || artwork.categorySlugs.length === 0) return [];
    return artwork.categorySlugs;
  }
}
