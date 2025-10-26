import { Component, inject, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ExhibitionService } from '@features/exhibitions/services/exhibition.service';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-about',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule
  ],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutComponent implements OnInit, OnDestroy {
  private readonly exhibitionService = inject(ExhibitionService);
  private readonly scrollAnimationService = inject(ScrollAnimationService);

  readonly recentExhibitions$ = this.exhibitionService.getAllExhibitions().pipe(
    map(exhibitions => exhibitions.slice(0, 3))
  );

  ngOnInit(): void {
    this.scrollAnimationService.setupScrollAnimations();
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }

  formatDateBlock(startDate?: string, endDate?: string): string {
    if (!startDate) return 'Date à confirmer';

    const start = new Date(startDate);
    const startDay = start.getDate().toString().padStart(2, '0');
    const startMonth = start.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();
    const startYear = start.getFullYear();

    if (!endDate) {
      return `${startDay} ${startMonth} ${startYear}`;
    }

    const end = new Date(endDate);
    const endDay = end.getDate().toString().padStart(2, '0');
    const endMonth = end.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();
    const endYear = end.getFullYear();

    if (startYear === endYear && startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth} ${startYear}`;
    }

    if (startYear === endYear) {
      return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`;
    }

    return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
  }
}
