import {ChangeDetectionStrategy, Component, inject, PLATFORM_ID, signal} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {RouterLink} from '@angular/router';
import {catchError, EMPTY} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {environment} from '@environments/environment';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {TranslateService} from '@core/services/translate.service';
import {NotificationService} from '@shared/services/notification.service';
import {MatSnackBarModule} from '@angular/material/snack-bar';

@Component({
  selector: 'app-admin-invite',
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterLink, TranslatePipe, MatSnackBarModule],
  templateUrl: './admin-invite.component.html',
  styleUrl: './admin-invite.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminInviteComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly translateService = inject(TranslateService);
  private readonly notificationService = inject(NotificationService);
  protected readonly isLoading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly unauthorized = signal(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('key') !== environment.inviteKey) {
        this.unauthorized.set(true);
      }
    }
  }

  protected submit(): void {
    if (this.form.invalid) return;
    this.isLoading.set(true);
    this.http.post<void>(
      `${environment.apiUrl}/admin/auth/invite`,
      { email: this.form.value.email },
      { responseType: 'text' as 'json' }
    ).pipe(
      catchError((err) => {
        let message = this.translateService.translate('admin.invite.error');
        try {
          const parsed = typeof err.error === 'string' ? JSON.parse(err.error) : err.error;
          if (parsed?.message) {
            message = parsed.message;
          }
        } catch {}
        this.notificationService.error(message);
        this.isLoading.set(false);
        return EMPTY;
      })
    ).subscribe(() => {
      this.isLoading.set(false);
      this.submitted.set(true);
    });
  }
}
