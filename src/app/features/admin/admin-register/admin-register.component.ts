import {ChangeDetectionStrategy, Component, inject, PLATFORM_ID, signal} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {AbstractControl, FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {catchError, EMPTY} from 'rxjs';
import {environment} from '@environments/environment';
import {HttpClient} from '@angular/common/http';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {TranslateService} from '@core/services/translate.service';
import {NotificationService} from '@shared/services/notification.service';

@Component({
  selector: 'app-admin-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, RouterLink, MatIcon, TranslatePipe],
  templateUrl: './admin-register.component.html',
  styleUrl: './admin-register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminRegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);
  private readonly translateService = inject(TranslateService);
  protected readonly isLoading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly error = signal(false);
  protected readonly errorMessage = signal<string>('');
  protected readonly invalidToken = signal(false);

  protected readonly form = this.fb.group({
    displayName: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    token: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  private passwordMatchValidator(group: AbstractControl) {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        this.form.patchValue({ token });
      } else {
        this.invalidToken.set(true);
      }
    }
    this.errorMessage.set(this.translateService.translate('admin.register.errors.generic'));
  }

  protected togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  protected toggleConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }

  protected submit(): void {
    if (this.form.invalid) return;
    this.isLoading.set(true);
    this.error.set(false);
    const { token, confirmPassword, ...body } = this.form.value;
    this.http.post<void>(
      `${environment.apiUrl}/admin/auth/register?token=${token}`,
      body,
      { responseType: 'text' as 'json' }
    ).pipe(
      catchError((err) => {
        let message = this.translateService.translate('admin.register.errors.generic');
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
