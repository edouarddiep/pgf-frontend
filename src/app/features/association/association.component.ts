import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';

@Component({
  selector: 'app-association',
  imports: [CommonModule, MatButtonModule],
  templateUrl: './association.component.html',
  styleUrl: './association.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssociationComponent implements OnInit, OnDestroy {
  private readonly scrollAnimationService = inject(ScrollAnimationService);

  ngOnInit(): void {
    this.scrollAnimationService.setupScrollAnimations();
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }
}
