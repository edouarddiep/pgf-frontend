import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { ExhibitionService } from '@features/exhibitions/services/exhibition.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-about',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    LazyLoadImageModule
  ],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutComponent {
  private readonly exhibitionService = inject(ExhibitionService);

  readonly recentExhibitions$ = this.exhibitionService.getAllExhibitions().pipe(
    map(exhibitions => exhibitions.slice(0, 3))
  );

  getStatusLabel(status: string): string {
    const labels = {
      'UPCOMING': 'A venir',
      'ONGOING': 'En cours',
      'PAST': 'Terminé'
    };
    return labels[status as keyof typeof labels] || status;
  }
}
