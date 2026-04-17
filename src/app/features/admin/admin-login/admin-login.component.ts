import {Component, ChangeDetectionStrategy, inject, signal, PLATFORM_ID} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService } from '@features/admin/services/admin.service';
import { catchError, EMPTY } from 'rxjs';
import {TranslatePipe} from '@core/pipes/translate.pipe';

@Component({
  selector: 'app-admin-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    TranslatePipe
  ],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly isLoading = signal(false);
  protected readonly loginError = signal(false);
  protected readonly showPassword = signal(false);

  protected readonly loginMode = signal<'legacy' | 'email'>('email');

  protected readonly loginForm = this.fb.group({
    email: ['', [Validators.email]],
    password: ['', [Validators.required]]
  });

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('legacy') === 'true') {
        this.loginMode.set('legacy');
      }
    }
  }

  protected togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  protected toggleMode(): void {
    this.loginMode.update(m => m === 'email' ? 'legacy' : 'email');
    this.loginError.set(false);
  }

  protected login(): void {
    if (this.loginForm.invalid) return;
    this.isLoading.set(true);
    this.loginError.set(false);
    const { email, password } = this.loginForm.value;

    const login$ = this.loginMode() === 'email'
      ? this.adminService.login(email!, password!)
      : this.adminService.login(password!);

    login$.pipe(
      catchError(() => {
        this.loginError.set(true);
        this.isLoading.set(false);
        return EMPTY;
      })
    ).subscribe(() => {
      this.isLoading.set(false);
      this.router.navigate(['/admin']);
    });
  }
}
