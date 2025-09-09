import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContactFormData } from '@core/models/contact.model';
import { catchError, finalize, of } from 'rxjs';
import {ApiService} from '@core/services/api.service';

@Component({
  selector: 'app-contact-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isSubmitting = signal(false);
  readonly isSubmitted = signal(false);

  readonly contactForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    subject: [''],
    message: ['', [Validators.required, Validators.minLength(10)]]
  });

  onSubmit(): void {
    if (this.contactForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);

      const formData: ContactFormData = this.contactForm.value as ContactFormData;

      this.apiService.sendContactMessage(formData).pipe(
        catchError(error => {
          this.snackBar.open(
            'Erreur lors de l\'envoi du message. Veuillez rÃ©essayer.',
            'Fermer',
            { duration: 5000 }
          );
          return of(null);
        }),
        finalize(() => this.isSubmitting.set(false))
      ).subscribe(response => {
        if (response) {
          this.isSubmitted.set(true);
          this.contactForm.reset();
          this.snackBar.open(
            'Message envoyÃ© avec succÃ¨s !',
            'Fermer',
            { duration: 3000 }
          );
        }
      });
    }
  }
}
