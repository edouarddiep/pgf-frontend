import { Directive, ElementRef, inject, OnInit, OnDestroy, Renderer2, effect } from '@angular/core';
import { LoadingService } from '@shared/services/loading.service';

@Directive({
  selector: '[appLoading]',
  standalone: true
})
export class LoadingDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly loadingService = inject(LoadingService);
  private overlay?: HTMLElement;
  private loadingEffect?: ReturnType<typeof effect>;

  ngOnInit(): void {
    this.loadingEffect = effect(() => {
      const isLoading = this.loadingService.isLoading();
      if (isLoading) {
        this.showLoading();
      } else {
        this.hideLoading();
      }
    });
  }

  ngOnDestroy(): void {
    this.loadingEffect?.destroy();
    this.hideLoading();
  }

  private showLoading(): void {
    if (this.overlay) return;

    const element = this.el.nativeElement;

    this.overlay = this.renderer.createElement('div');
    this.renderer.addClass(this.overlay, 'loading-overlay');

    this.overlay.innerHTML = `
      <div class="spinner-container">
        <span class="bar bar-top"></span>
        <span class="bar bar-right"></span>
        <span class="bar bar-bottom"></span>
        <span class="bar bar-left"></span>
      </div>
    `;

    const currentPosition = window.getComputedStyle(element).position;
    if (currentPosition === 'static') {
      this.renderer.setStyle(element, 'position', 'relative');
    }
    this.renderer.appendChild(element, this.overlay);
  }

  private hideLoading(): void {
    if (this.overlay) {
      this.renderer.removeChild(this.el.nativeElement, this.overlay);
      this.overlay = undefined;
    }
  }
}
