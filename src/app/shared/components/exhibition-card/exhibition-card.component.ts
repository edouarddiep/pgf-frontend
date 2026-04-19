import { Component, input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { Exhibition, ExhibitionStatus } from '@core/models/exhibition.model';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { TranslateService } from '@core/services/translate.service';

@Component({
  selector: 'app-exhibition-card',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, LazyLoadImageModule, TranslatePipe],
  templateUrl: './exhibition-card.component.html',
  styleUrl: './exhibition-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExhibitionCardComponent {
  private readonly translateService = inject(TranslateService);

  readonly exhibition = input.required<Exhibition>();

  getStatusLabel(status: ExhibitionStatus): string {
    const keys: Record<ExhibitionStatus, string> = {
      [ExhibitionStatus.UPCOMING]: 'exhibitions.status.upcoming',
      [ExhibitionStatus.ONGOING]: 'exhibitions.status.ongoing',
      [ExhibitionStatus.PAST]: 'exhibitions.status.past'
    };
    return this.translateService.translate(keys[status] ?? status);
  }

  getChipColor(status: ExhibitionStatus): string {
    const colors: Record<ExhibitionStatus, string> = {
      [ExhibitionStatus.UPCOMING]: 'primary',
      [ExhibitionStatus.ONGOING]: 'accent',
      [ExhibitionStatus.PAST]: ''
    };
    return colors[status] || '';
  }
}
