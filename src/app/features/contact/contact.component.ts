import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@shared/services/notification.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { delay } from 'rxjs';

@Component({
  selector: 'app-contact',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactComponent {
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(ApiService);
  private readonly notificationService = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly submitSuccess = signal(false);
  readonly submitError = signal(false);

  readonly instagramUrl = 'https://www.instagram.com/pierrette_gf?igsh=azh0bGV6ZzltMzdj&utm_source=qr';
  readonly instagramLogoUrl = 'https://bhjpavcxhymxcadesnqy.supabase.co/storage/v1/object/public/oeuvres/yaya/images/insta-logo.jpg';

  readonly contactForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    firstName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    subject: ['', [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
  });

  getMessageLength(): number {
    return this.contactForm.get('message')?.value?.length || 0;
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      Object.keys(this.contactForm.controls).forEach(key => this.contactForm.get(key)?.markAsTouched());
      return;
    }

    this.isSubmitting.set(true);
    this.submitSuccess.set(false);
    this.submitError.set(false);

    const { name, firstName, email, phone, subject, message } = this.contactForm.value;
    const payload = { name: `${firstName} ${name}`, email, phone, subject, message };

    this.apiService.sendContactMessage(payload).pipe(delay(2500)).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.submitSuccess.set(true);
        this.resetForm();
        setTimeout(() => this.submitSuccess.set(false), 5000);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.submitError.set(true);
        setTimeout(() => this.submitError.set(false), 5000);
      }
    });
  }

  private resetForm(): void {
    this.contactForm.reset({ name: '', firstName: '', email: '', phone: '', subject: '', message: '' });
    Object.keys(this.contactForm.controls).forEach(key => {
      this.contactForm.get(key)?.setErrors(null);
      this.contactForm.get(key)?.markAsPristine();
      this.contactForm.get(key)?.markAsUntouched();
    });
  }
}
