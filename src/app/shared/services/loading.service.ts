import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly loadingSignal = signal(false);
  private loadingCount = 0;
  private showTimeout: ReturnType<typeof setTimeout> | null = null;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;
  private showStartedAt: number | null = null;

  private readonly SHOW_DELAY = 500;
  private readonly MIN_DISPLAY = 1700;

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
        this.showStartedAt = Date.now();
        this.showTimeout = null;
      }, this.SHOW_DELAY);
    }
  }

  hide(): void {
    this.loadingCount--;

    if (this.loadingCount > 0) return;
    this.loadingCount = 0;

    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
      return;
    }

    if (!this.loadingSignal()) return;

    const elapsed = this.showStartedAt ? Date.now() - this.showStartedAt : 0;
    const remaining = Math.max(0, this.MIN_DISPLAY - elapsed);

    this.hideTimeout = setTimeout(() => {
      this.loadingSignal.set(false);
      this.hideTimeout = null;
      this.showStartedAt = null;
    }, remaining);
  }
}
