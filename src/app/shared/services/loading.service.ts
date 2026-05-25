import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly loadingSignal = signal(false);
  private loadingCount = 0;
  private showTimeout: ReturnType<typeof setTimeout> | null = null;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly showDelay = 150;
  private readonly minDisplayTime = 300;

  readonly isLoading = this.loadingSignal.asReadonly();

  show(): void {
    this.loadingCount++;

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    if (!this.showTimeout && !this.loadingSignal()) {
      this.showTimeout = setTimeout(() => {
        if (this.loadingCount > 0) {
          this.loadingSignal.set(true);
        }
        this.showTimeout = null;
      }, this.showDelay);
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
