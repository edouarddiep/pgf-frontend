import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';

@Component({
  selector: 'app-terms',
  imports: [CommonModule],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TermsComponent implements OnInit, OnDestroy {
  private readonly scrollAnimationService = inject(ScrollAnimationService);

  ngOnInit(): void {
    this.scrollAnimationService.setupScrollAnimations();
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }
}
