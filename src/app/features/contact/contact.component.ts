import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';

import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatOption, MatSelect, MatSelectTrigger} from '@angular/material/select';
import {ApiService} from '@core/services/api.service';
import {NotificationService} from '@shared/services/notification.service';
import {delay, startWith} from 'rxjs';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {CountryCode, getCountries, getCountryCallingCode} from 'libphonenumber-js';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs/operators';
import {LoadingSpinnerComponent} from '@shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-contact',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatOption,
    MatSelect,
    MatSelectTrigger,
    TranslatePipe,
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
    phonePrefix: ['+41'],
    phone: [''],
    subject: ['', [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
  });

  readonly phonePrefixes = (() => {
    const priority = ['CH', 'FR', 'IT', 'DE', 'AT'];
    const all = getCountries().map(country => ({
      code: country as CountryCode,
      prefix: `+${getCountryCallingCode(country as CountryCode)}`,
      label: new Intl.DisplayNames(['fr'], { type: 'region' }).of(country) ?? country
    }));

    const pinned = priority
      .map(c => all.find(p => p.code === c)!)
      .filter(Boolean);

    const rest = all
      .filter(p => !priority.includes(p.code))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

    return [...pinned, ...rest];
  })();

  readonly prefixSearch = new FormControl('');
  protected selectedPrefix = '+41';

  readonly filteredPrefixes = toSignal(
    this.prefixSearch.valueChanges.pipe(
      startWith(''),
      map(q => {
        const search = (q || '').toLowerCase().replace('+', '').trim();
        if (!search) return this.phonePrefixes.slice(0, 20);
        return this.phonePrefixes.filter(p =>
          p.prefix.replace('+', '').startsWith(search) ||
          p.label.toLowerCase().includes(search)
        ).slice(0, 20);
      })
    ),
    { initialValue: this.phonePrefixes.slice(0, 20) }
  );

  protected onPrefixSelected(p: { code: CountryCode; prefix: string; label: string }): void {
    this.selectedPrefix = p.prefix;
    this.prefixSearch.setValue('', { emitEvent: false });
  }

  protected getPrefixDisplay(): string {
    return this.selectedPrefix;
  }

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

    const { name, firstName, email, phonePrefix, phone, subject, message } = this.contactForm.value;
    const fullPhone = phone ? `${phonePrefix} ${phone}` : '';
    const payload = { name: `${firstName} ${name}`, email, phone: fullPhone, subject, message };

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

  protected onPrefixFocus(): void {
    this.prefixSearch.setValue('', { emitEvent: true });
  }

  protected onPrefixBlur(): void {
    setTimeout(() => {
      if (!this.selectedPrefix) return;
      this.prefixSearch.setValue(this.selectedPrefix, { emitEvent: false });
    }, 200);
  }

  private resetForm(): void {
    this.contactForm.reset({ name: '', firstName: '', email: '', phonePrefix: '+41', phone: '', subject: '', message: '' });
    Object.keys(this.contactForm.controls).forEach(key => {
      this.contactForm.get(key)?.setErrors(null);
      this.contactForm.get(key)?.markAsPristine();
      this.contactForm.get(key)?.markAsUntouched();
    });
  }
}
