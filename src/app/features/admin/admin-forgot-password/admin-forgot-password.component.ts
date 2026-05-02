import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';

import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {RouterLink} from '@angular/router';
import {catchError, EMPTY} from 'rxjs';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {AdminService} from '@features/admin/services/admin.service';

@Component({
  selector: 'app-admin-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterLink, TranslatePipe],
  templateUrl: './admin-forgot-password.component.html',
  styleUrl: './admin-forgot-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);
  protected readonly isLoading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  protected submit(): void {
    if (this.form.invalid) return;
    this.isLoading.set(true);
    this.error.set(false);
    this.adminService.resetPassword(this.form.value.email!).pipe(
      catchError(() => {
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
