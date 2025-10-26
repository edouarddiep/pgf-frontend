import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-contact',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactComponent {
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isSubmitting = signal(false);

  readonly contactForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    firstName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    subject: ['', [Validators.required]],
    message: ['', [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(500)
    ]]
  });

  getMessageLength(): number {
    const messageControl = this.contactForm.get('message');
    return messageControl?.value?.length || 0;
  }

  onSubmit(): void {
    if (this.contactForm.valid) {
      this.isSubmitting.set(true);

      const formData = {
        ...this.contactForm.value,
        fullName: `${this.contactForm.value.firstName} ${this.contactForm.value.name}`
      };

      this.apiService.sendContactMessage(formData).subscribe({
        next: () => {
          this.snackBar.open('Message envoyé avec succès !', 'Fermer', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          this.contactForm.reset();
          this.isSubmitting.set(false);
        },
        error: (error) => {
          this.snackBar.open('Erreur lors de l\'envoi du message', 'Fermer', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isSubmitting.set(false);
        }
      });
    } else {
      Object.keys(this.contactForm.controls).forEach(key => {
        this.contactForm.get(key)?.markAsTouched();
      });
    }
  }
}
