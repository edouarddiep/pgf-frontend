import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { ExhibitionCardComponent } from '@shared/components/exhibition-card/exhibition-card.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { ExhibitionService } from '@features/exhibitions/services/exhibition.service';

@Component({
  selector: 'app-exhibitions',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    LazyLoadImageModule,
    ExhibitionCardComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './exhibitions.component.html',
  styleUrl: './exhibitions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExhibitionsComponent {
  private readonly exhibitionService = inject(ExhibitionService);

  readonly exhibitions$ = this.exhibitionService.getAllExhibitions();
}
