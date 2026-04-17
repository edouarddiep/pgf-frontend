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

@Component({
  selector: 'app-admin-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, RouterLink, MatIcon],
  templateUrl: './admin-register.component.html',
  styleUrl: './admin-register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminRegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  protected readonly isLoading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly error = signal(false);
  protected readonly errorMessage = signal<string>('Une erreur est survenue. Veuillez réessayer.');

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    displayName: ['', [Validators.required]],
    secret: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  private passwordMatchValidator(group: AbstractControl) {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const params = new URLSearchParams(window.location.search);
      const secret = params.get('secret');
      if (secret) {
        this.form.patchValue({ secret });
      }
    }
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
    const { secret, confirmPassword, ...body } = this.form.value;
    this.http.post<void>(
      `${environment.apiUrl}/admin/auth/register?secret=${secret}`,
      body,
      { responseType: 'text' as 'json' }
    ).pipe(
      catchError((err) => {
        this.errorMessage.set(err.error ?? 'Une erreur est survenue. Veuillez réessayer.');
        this.error.set(true);
        this.isLoading.set(false);
        return EMPTY;
      })
    ).subscribe(() => {
      this.isLoading.set(false);
      this.submitted.set(true);
    });
  }
}
