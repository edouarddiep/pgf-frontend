import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject } from '@angular/core';

import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { NavService } from '@core/services/nav.service';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-association',
  imports: [RouterModule, MatButtonModule, TranslatePipe, MatIcon],
  templateUrl: './association.component.html',
  styleUrl: './association.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssociationComponent implements OnInit, OnDestroy {
  private readonly scrollAnimationService = inject(ScrollAnimationService);
  protected readonly navService = inject(NavService);

  ngOnInit(): void {
    this.scrollAnimationService.setupScrollAnimations();
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }
}
