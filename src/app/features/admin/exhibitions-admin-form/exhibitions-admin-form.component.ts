import {
  Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MatNativeDateModule, MAT_DATE_LOCALE, MAT_DATE_FORMATS,
  DateAdapter, NativeDateAdapter, MatOption
} from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AdminService } from '@features/admin/services/admin.service';
import { Exhibition } from '@core/models/exhibition.model';
import { ImageUploadComponent } from '@shared/components/image-upload/image-upload.component';
import { NotificationService } from '@shared/services/notification.service';
import { catchError, EMPTY, filter, finalize, Subject, switchMap, takeUntil } from 'rxjs';
import { Injectable } from '@angular/core';
import { HasUnsavedChanges } from '@features/admin/guards/unsaved-changes.guard';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';
import { FileUploadService } from '@core/services/file-upload.service';
import { AddressService, SwissAddress } from '@core/services/adresse.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { TranslateService } from '@core/services/translate.service';
import { LocaleService } from '@core/services/locale.service';

interface ExhibitionFormData {
  title: string;
  description?: string;
  location: string;
  street?: string;
  streetNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  startDate: Date | null;
  endDate: Date | null;
  vernissageUrl?: string;
  websiteUrl?: string;
}

@Injectable()
export class SwissDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    if (!date || isNaN(date.getTime())) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}.${date.getFullYear()}`;
  }

  override parse(value: string): Date | null {
    if (!value || value.trim() === '') return null;
    const parts = value.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && day <= 31 && month >= 0 && month <= 11 && year > 1900) {
        const date = new Date(year, month, day);
        if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) return date;
      }
    }
    return null;
  }
}

const SWISS_DATE_FORMATS = {
  parse: { dateInput: 'DD.MM.YYYY' },
  display: { dateInput: 'DD.MM.YYYY', monthYearLabel: 'MMM YYYY', dateA11yLabel: 'DD.MM.YYYY', monthYearA11yLabel: 'MMMM YYYY' }
};

function endDateValidator(control: AbstractControl) {
  const startDate = control.get('startDate')?.value;
  const endDate = control.get('endDate')?.value;
  if (!startDate || !endDate) return null;
  return new Date(endDate) < new Date(startDate) ? { endDateBeforeStart: true } : null;
}

@Component({
  selector: 'app-exhibitions-admin-form',
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatCardModule, MatDatepickerModule,
    MatNativeDateModule, MatChipsModule, MatTooltipModule, MatProgressSpinnerModule,
    MatProgressBarModule, ImageUploadComponent, TranslatePipe,
    MatAutocomplete, MatOption, MatAutocompleteTrigger
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'fr-CH' },
    { provide: MAT_DATE_FORMATS, useValue: SWISS_DATE_FORMATS },
    { provide: DateAdapter, useClass: SwissDateAdapter }
  ],
  templateUrl: './exhibitions-admin-form.component.html',
  styleUrl: './exhibitions-admin-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExhibitionsAdminFormComponent implements OnInit, OnDestroy, HasUnsavedChanges {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly addressService = inject(AddressService);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly translateService = inject(TranslateService);
  protected readonly localeService = inject(LocaleService);
  protected readonly lang = computed(() => this.translateService.currentLang());

  private readonly destroy$ = new Subject<void>();
  private readonly streetSearch$ = new Subject<string>();

  protected readonly editingExhibition = signal<Exhibition | null>(null);
  protected readonly uploadedImageUrls = signal<string[]>([]);
  protected readonly isSaving = signal(false);
  protected readonly uploadedVideoUrls = signal<string[]>([]);
  protected readonly uploadingVideos = signal(false);
  protected readonly showImageModal = signal(false);
  protected readonly modalImageUrl = signal<string>('');
  protected readonly mainImageUrl = signal<string | undefined>(undefined);
  protected readonly showVideoModal = signal(false);
  protected readonly modalVideoUrl = signal<string>('');
  protected readonly imageRequired = signal(false);
  protected readonly addressSuggestions = signal<SwissAddress[]>([]);

  readonly hasUnsavedChanges = signal(false);
  readonly isFormMode = () => true;

  protected readonly exhibitionForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    location: ['', [Validators.required, Validators.minLength(2)]],
    street: ['', Validators.required],
    streetNumber: ['', Validators.required],
    postalCode: ['', Validators.required],
    city: ['', Validators.required],
    vernissageUrl: [''],
    websiteUrl: [''],
    country: ['Suisse', Validators.required],
    startDate: [null as Date | null, [Validators.required]],
    endDate: [null as Date | null, [Validators.required]]
  }, { validators: endDateValidator });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.streetSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(v => v.length >= 3),
      switchMap(v => this.addressService.searchAddresses(v)),
      takeUntil(this.destroy$)
    ).subscribe(results => this.addressSuggestions.set(results));

    if (id) {
      this.adminService.getExhibitions()
        .pipe(catchError(() => EMPTY))
        .subscribe(exhibitions => {
          const exhibition = exhibitions.find(e => e.id === +id);
          if (exhibition) {
            this.fillForm(exhibition);
            this.exhibitionForm.markAsPristine();
          }
          this.trackChanges();
        });
    } else {
      this.trackChanges();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private trackChanges(): void {
    this.exhibitionForm.valueChanges.subscribe(() => this.hasUnsavedChanges.set(true));
  }

  private fillForm(exhibition: Exhibition): void {
    this.editingExhibition.set(exhibition);
    const addr = this.parseAddress(exhibition.address || '');
    this.exhibitionForm.patchValue({
      title: exhibition.title,
      description: exhibition.description || '',
      location: exhibition.location,
      street: addr.street,
      vernissageUrl: exhibition.vernissageUrl || '',
      websiteUrl: exhibition.websiteUrl || '',
      streetNumber: addr.streetNumber,
      postalCode: addr.postalCode,
      city: addr.city,
      country: addr.country || 'Suisse',
      startDate: exhibition.startDate ? new Date(exhibition.startDate) : null,
      endDate: exhibition.endDate ? new Date(exhibition.endDate) : null
    });

    const uniqueUrls = exhibition.imageUrls?.length
      ? Array.from(new Set(exhibition.imageUrls))
      : (exhibition.imageUrl ? [exhibition.imageUrl] : []);
    const mainUrl = exhibition.imageUrl ?? uniqueUrls[0];
    this.mainImageUrl.set(mainUrl);
    this.uploadedImageUrls.set(uniqueUrls.filter(url => url !== mainUrl));
    this.uploadedVideoUrls.set(exhibition.videoUrls || []);
    this.hasUnsavedChanges.set(false);

    setTimeout(() => {
      this.exhibitionForm.markAsPristine();
      this.exhibitionForm.markAsUntouched();
      this.hasUnsavedChanges.set(false);
    });
  }

  protected cancel(): void {
    this.router.navigate(['/admin/exhibitions']);
  }

  protected onStreetInput(value: string): void {
    if (!value || value.length < 3) {
      this.addressSuggestions.set([]);
    }
    this.streetSearch$.next(value);
  }

  protected onAddressSelected(addr: SwissAddress): void {
    this.exhibitionForm.patchValue({
      street: addr.street,
      streetNumber: addr.houseNumber || '',
      postalCode: addr.postalCode,
      city: addr.locality
    });
    this.addressSuggestions.set([]);
  }

  protected onMainImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    input.value = '';

    this.fileUploadService.uploadExhibitionImage(file, this.getExhibitionSlug(), 1)
      .pipe(catchError(() => {
        this.notificationService.error(this.translateService.translate('admin.exhibitions.uploadError'));
        return EMPTY;
      }))
      .subscribe(result => {
        const previousMain = this.mainImageUrl();
        if (previousMain) {
          this.uploadedImageUrls.update(urls => [previousMain, ...urls]);
        }
        this.mainImageUrl.set(result.imageUrl);
        this.imageRequired.set(false);
        this.hasUnsavedChanges.set(true);
      });
  }

  protected onOtherImagesChanged(event: { urls: string[]; mainUrl: string | undefined }): void {
    const newMain = event.mainUrl;
    const previousMain = this.mainImageUrl();

    if (newMain && previousMain && newMain !== previousMain) {
      this.uploadedImageUrls.set([previousMain, ...event.urls.filter(url => url !== newMain)]);
      this.mainImageUrl.set(newMain);
    } else {
      this.uploadedImageUrls.set(event.urls);
    }
    this.hasUnsavedChanges.set(true);
  }

  protected onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    const validFiles = Array.from(input.files).filter(f => {
      if (f.size > 500 * 1024 * 1024) {
        this.notificationService.error(`${f.name}: ${this.translateService.translate('admin.exhibitions.videoTooLarge')}`);
        return false;
      }
      if (!validTypes.includes(f.type)) {
        this.notificationService.error(`${f.name}: ${this.translateService.translate('admin.exhibitions.videoInvalidFormat')}`);
        return false;
      }
      return true;
    });

    this.uploadVideos(validFiles);
    input.value = '';
  }

  private uploadVideos(files: File[]): void {
    if (files.length === 0) return;
    this.uploadingVideos.set(true);
    const exhibitionSlug = this.getExhibitionSlug();
    const startIndex = this.uploadedVideoUrls().length;
    let uploadIndex = 0;

    const processNext = () => {
      if (uploadIndex >= files.length) { this.uploadingVideos.set(false); return; }
      const videoIndex = startIndex + uploadIndex + 1;
      this.adminService.uploadExhibitionVideo(files[uploadIndex], exhibitionSlug, videoIndex)
        .pipe(catchError(() => {
          this.notificationService.error(`${this.translateService.translate('admin.exhibitions.uploadVideoError')}: ${files[uploadIndex].name}`);
          return EMPTY;
        }))
        .subscribe(result => {
          this.uploadedVideoUrls.update(urls => [...urls, result.videoUrl]);
          this.hasUnsavedChanges.set(true);
          uploadIndex++;
          processNext();
        });
    };
    processNext();
  }

  protected removeVideo(index: number): void {
    this.uploadedVideoUrls.update(urls => urls.filter((_, i) => i !== index));
    this.hasUnsavedChanges.set(true);
  }

  protected saveExhibition(): void {
    if (!this.mainImageUrl()) {
      this.imageRequired.set(true);
    }
    if (this.exhibitionForm.invalid || this.isSaving() || !this.mainImageUrl()) return;

    this.isSaving.set(true);
    const formData = this.exhibitionForm.value as ExhibitionFormData;
    const mainUrl = this.mainImageUrl()!;
    const imageUrls = [mainUrl, ...this.uploadedImageUrls()];

    const exhibitionData = {
      title: formData.title!,
      description: formData.description || undefined,
      location: formData.location!,
      address: this.buildAddress() || undefined,
      vernissageUrl: formData.vernissageUrl || undefined,
      websiteUrl: formData.websiteUrl || undefined,
      startDate: this.formatDateForBackend(formData.startDate!),
      endDate: formData.endDate ? this.formatDateForBackend(formData.endDate) : undefined,
      imageUrl: mainUrl,
      imageUrls,
      videoUrls: this.uploadedVideoUrls()
    };

    const editing = this.editingExhibition();
    const operation = editing
      ? this.adminService.updateExhibition(editing.id, exhibitionData)
      : this.adminService.createExhibition(exhibitionData);

    operation.pipe(
      catchError(() => {
        this.notificationService.error(this.translateService.translate('admin.exhibitions.saveError'));
        return EMPTY;
      }),
      finalize(() => this.isSaving.set(false))
    ).subscribe(() => {
      this.notificationService.success(
        this.translateService.translate(editing ? 'admin.exhibitions.saveSuccess' : 'admin.exhibitions.createSuccess')
      );
      window.dispatchEvent(new CustomEvent('exhibitionChanged'));
      this.hasUnsavedChanges.set(false);
      this.router.navigate(['/admin/exhibitions']);
    });
  }

  protected deleteExhibition(id: number): void {
    this.confirmDialog.confirm({
      title: this.translateService.translate('admin.exhibitions.deleteConfirmTitle'),
      message: this.translateService.translate('admin.exhibitions.deleteConfirmMessage'),
      confirmLabel: this.translateService.translate('admin.common.delete'),
      cancelLabel: this.translateService.translate('admin.common.cancel')
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.adminService.deleteExhibition(id)
        .pipe(catchError(() => {
          this.notificationService.error(this.translateService.translate('admin.exhibitions.deleteError'));
          return EMPTY;
        }))
        .subscribe(() => {
          this.notificationService.success(this.translateService.translate('admin.exhibitions.deleteSuccess'));
          window.dispatchEvent(new CustomEvent('exhibitionChanged'));
          this.hasUnsavedChanges.set(false);
          this.router.navigate(['/admin/exhibitions']);
        });
    });
  }

  protected getExhibitionSlug(): string {
    const editing = this.editingExhibition();
    const title = editing ? editing.title : (this.exhibitionForm.get('title')?.value || 'nouvelle-exposition');
    return this.generateSlug(title);
  }

  protected openImageModal(url: string): void {
    this.modalImageUrl.set(url);
    this.showImageModal.set(true);
  }

  protected closeImageModal(): void {
    this.showImageModal.set(false);
  }

  protected openVideoModal(url: string): void {
    this.modalVideoUrl.set(url);
    this.showVideoModal.set(true);
  }

  protected closeVideoModal(): void {
    this.showVideoModal.set(false);
  }

  private formatDateForBackend(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private parseAddress(address: string): { street: string; streetNumber: string; postalCode: string; city: string; country: string } {
    const parts = address.split(',').map(p => p.trim());
    const cityPostalMatch = parts[2]?.match(/^(\d+)\s+(.+)$/);
    return {
      street: parts[0] || '',
      streetNumber: parts[1] || '',
      postalCode: cityPostalMatch ? cityPostalMatch[1] : '',
      city: cityPostalMatch ? cityPostalMatch[2] : (parts[2] || ''),
      country: parts[3] || ''
    };
  }

  private buildAddress(): string {
    const v = this.exhibitionForm.value;
    return [v.street, v.streetNumber, v.postalCode && v.city ? `${v.postalCode} ${v.city}` : v.city, v.country]
      .filter(Boolean).join(', ');
  }

  private generateSlug(title: string): string {
    return title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
}
