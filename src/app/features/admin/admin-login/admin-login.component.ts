import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {AdminService} from '@features/admin/services/admin.service';
import { catchError, EMPTY } from 'rxjs';

@Component({
  selector: 'app-admin-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(false);
  protected readonly loginError = signal(false);

  protected readonly loginForm = this.fb.group({
    password: ['', [Validators.required]]
  });

  protected login(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.loginError.set(false);

    const password = this.loginForm.value.password!;

    this.adminService.login(password)
      .pipe(
        catchError(() => {
          this.loginError.set(true);
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.isLoading.set(false);
        this.router.navigate(['/admin']);
      });
  }

  protected hasError(): boolean {
    return this.loginError();
  }
}
