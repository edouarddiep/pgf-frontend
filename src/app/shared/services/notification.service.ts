import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  private readonly defaultConfig: MatSnackBarConfig = {
    duration: 4000,
    horizontalPosition: 'center',
    verticalPosition: 'bottom'
  };

  success(message: string): void {
    this.snackBar.open(message, '✓', {
      ...this.defaultConfig,
      panelClass: ['success-snackbar']
    });
  }

  error(message: string): void {
    this.snackBar.open(message, '✗', {
      ...this.defaultConfig,
      duration: 6000,
      panelClass: ['error-snackbar']
    });
  }

  info(message: string): void {
    this.snackBar.open(message, 'ℹ', {
      ...this.defaultConfig,
      panelClass: ['info-snackbar']
    });
  }
}
