import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { Exhibition, ExhibitionStatus } from '@core/models/exhibition.model';

@Component({
  selector: 'app-exhibition-card',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    LazyLoadImageModule
  ],
  templateUrl: './exhibition-card.component.html',
  styleUrl: './exhibition-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExhibitionCardComponent {
  readonly exhibition = input.required<Exhibition>();

  getStatusLabel(status: ExhibitionStatus): string {
    const labels = {
      [ExhibitionStatus.UPCOMING]: 'A venir',
      [ExhibitionStatus.ONGOING]: 'En cours',
      [ExhibitionStatus.PAST]: 'Terminé'
    };
    return labels[status] || status;
  }

  getChipColor(status: ExhibitionStatus): string {
    const colors = {
      [ExhibitionStatus.UPCOMING]: 'primary',
      [ExhibitionStatus.ONGOING]: 'accent',
      [ExhibitionStatus.PAST]: ''
    };
    return colors[status] || '';
  }
}
