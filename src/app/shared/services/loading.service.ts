import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private readonly loadingSignal = signal(false);
  private loadingCount = 0;
  private minDisplayTime = 300;
  private showTimeout: ReturnType<typeof setTimeout> | null = null;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly isLoading = this.loadingSignal.asReadonly();

  show(): void {
    this.loadingCount++;

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    if (!this.loadingSignal() && !this.showTimeout) {
      this.showTimeout = setTimeout(() => {
        this.loadingSignal.set(true);
        this.showTimeout = null;
      }, 200);
    }
  }

  hide(): void {
    this.loadingCount--;

    if (this.loadingCount <= 0) {
      this.loadingCount = 0;

      if (this.showTimeout) {
        clearTimeout(this.showTimeout);
        this.showTimeout = null;
        return;
      }

      if (this.loadingSignal()) {
        this.hideTimeout = setTimeout(() => {
          this.loadingSignal.set(false);
          this.hideTimeout = null;
        }, this.minDisplayTime);
      }
    }
  }
}
