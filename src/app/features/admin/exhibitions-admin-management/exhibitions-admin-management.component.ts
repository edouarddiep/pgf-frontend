import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  computed,
  OnDestroy,
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
  MatNativeDateModule,
  MAT_DATE_LOCALE,
  MAT_DATE_FORMATS,
  DateAdapter,
  NativeDateAdapter,
  MatOption
} from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { AdminService } from '@features/admin/services/admin.service';
import { Exhibition, ExhibitionStatus } from '@core/models/exhibition.model';
import { ImageUploadComponent } from '@shared/components/image-upload/image-upload.component';
import { NotificationService } from '@shared/services/notification.service';
import {catchError, EMPTY, filter, finalize, Subject, switchMap, takeUntil} from 'rxjs';
import { Injectable } from '@angular/core';
import { LoadingDirective } from '@/app/directives/loading.directive';
import { HighlightPipe } from '@core/pipes/highlight.pipe';
import {HasUnsavedChanges} from '@features/admin/guards/unsaved-changes.guard';
import {ExportColumn, ExportService} from '@shared/services/export.service';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {ConfirmDialogService} from '@shared/services/confirm-dialog.service';
import {FileUploadService} from '@core/services/file-upload.service';
import {AddressService, SwissAddress} from '@core/services/adresse.service';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';
import {MatAutocomplete, MatAutocompleteTrigger} from '@angular/material/autocomplete';
import {TranslateService} from '@core/services/translate.service';
import {LocaleService} from '@core/services/locale.service';
import {TruncatePipe} from '@core/pipes/truncate.pipe';

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
  selector: 'app-exhibitions-admin-management',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatTableModule,
    ImageUploadComponent,
    LoadingDirective,
    TranslatePipe,
    MatAutocomplete,
    MatOption,
    MatAutocompleteTrigger,
    TruncatePipe
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'fr-CH' },
    { provide: MAT_DATE_FORMATS, useValue: SWISS_DATE_FORMATS },
    { provide: DateAdapter, useClass: SwissDateAdapter }
  ],
  templateUrl: './exhibitions-admin-management.component.html',
  styleUrl: './exhibitions-admin-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExhibitionsAdminManagementComponent implements OnInit, OnDestroy, HasUnsavedChanges {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly exportService = inject(ExportService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly addressService = inject(AddressService);
  private readonly fileUploadService = inject(FileUploadService);
  protected readonly localeService = inject(LocaleService);
  protected readonly lang = computed(() => this.translateService.currentLang());

  private readonly translateService = inject(TranslateService);
  protected readonly rawExhibitions = signal<Exhibition[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly sortField = signal<'id' | 'title'>('id');
  protected readonly sortAsc = signal(true);
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
  private readonly destroy$ = new Subject<void>();
  private readonly streetSearch$ = new Subject<string>();

  protected readonly displayedColumns = ['id', 'image', 'title', 'status', 'actions'];

  protected readonly exhibitions = computed(() => {
    const field = this.sortField();
    const asc = this.sortAsc();
    const query = this.normalize(this.searchQuery().trim());

    let base = this.rawExhibitions();
    const tokens = query.split(/\s+/).filter(t => t.length >= 1);
    if (tokens.length > 0) {
      base = base.filter(e =>
        tokens.every(token =>
          e.id?.toString().includes(token) ||
          this.normalize(e.title ?? '').includes(token) ||
          this.normalize(e.location ?? '').includes(token)
        )
      );
    }

    return [...base].sort((a, b) => {
      const va = field === 'id' ? a.id : this.normalize(a.title ?? '');
      const vb = field === 'id' ? b.id : this.normalize(b.title ?? '');
      return asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  });

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

  readonly hasUnsavedChanges = signal(false);
  readonly isFormMode = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const url = this.router.url;
    const isCreate = url.endsWith('/create');
    const isEdit = !!id && url.endsWith('/edit');

    this.streetSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(v => v.length >= 3),
      switchMap(v => this.addressService.searchAddresses(v)),
      takeUntil(this.destroy$)
    )
      .subscribe(results => {
        console.log('address results', results);
        this.addressSuggestions.set(results);
      });

    if (isCreate || isEdit) {
      this.isFormMode.set(true);
      if (isEdit) {
        this.adminService.getExhibitions()
          .pipe(catchError(() => EMPTY))
          .subscribe(exhibitions => {
            const exhibition = exhibitions.find(e => e.id === +id!);
            if (exhibition) {
              this.fillForm(exhibition);
              this.exhibitionForm.markAsPristine();
            }
            this.exhibitionForm.valueChanges.subscribe(() => {
              if (this.isFormMode()) this.hasUnsavedChanges.set(true);
            });
          });
      } else {
        this.exhibitionForm.valueChanges.subscribe(() => {
          if (this.isFormMode()) this.hasUnsavedChanges.set(true);
        });
      }
    } else {
      this.loadExhibitions();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadExhibitions(): void {
    this.adminService.getExhibitions()
      .pipe(catchError(() => {
        this.notificationService.error(this.translateService.translate('admin.exhibitions.loadError'));
        return EMPTY;
      }))
      .subscribe(exhibitions => this.rawExhibitions.set(exhibitions));
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

  protected displayAddress(addr: SwissAddress): string {
    return addr?.formattedAddress || '';
  }

  protected showCreateForm(): void {
    this.router.navigate(['/admin/exhibitions/create']);
  }

  protected showEditForm(exhibition: Exhibition): void {
    this.router.navigate(['/admin/exhibitions', exhibition.id, 'edit']);
  }

  protected showList(): void {
    this.router.navigate(['/admin/exhibitions']);
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

  protected sort(field: 'id' | 'title'): void {
    if (this.sortField() === field) {
      this.sortAsc.update(v => !v);
    } else {
      this.sortField.set(field);
      this.sortAsc.set(true);
    }
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
      const othersWithoutNewMain = event.urls.filter(url => url !== newMain);
      this.uploadedImageUrls.set([previousMain, ...othersWithoutNewMain]);
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

  protected onSearchChange(value: string): void {
    this.searchQuery.set(value);
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
    const otherUrls = this.uploadedImageUrls();
    const imageUrls = [mainUrl, ...otherUrls];
    const videoUrls = this.uploadedVideoUrls();

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
      videoUrls
    };

    const editing = this.editingExhibition();
    const operation = editing
      ? this.adminService.updateExhibition(editing.id, exhibitionData)
      : this.adminService.createExhibition(exhibitionData);

    operation
      .pipe(
        catchError(() => {
          this.notificationService.error(this.translateService.translate('admin.exhibitions.saveError'));
          return EMPTY;
        }),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe(() => {
        this.notificationService.success(
          this.translateService.translate(editing ? 'admin.exhibitions.saveSuccess' : 'admin.exhibitions.createSuccess')
        );
        window.dispatchEvent(new CustomEvent('exhibitionChanged'));
        this.hasUnsavedChanges.set(false);
        this.router.navigate(['/admin/exhibitions']);
      });
  }

  private formatDateForBackend(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
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
          this.loadExhibitions();
        });
    });
  }

  protected formatDate(date: string | Date): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  protected getStatusLabel(status: ExhibitionStatus): string {
    const keys: Record<ExhibitionStatus, string> = {
      [ExhibitionStatus.UPCOMING]: 'admin.exhibitions.status.upcoming',
      [ExhibitionStatus.ONGOING]: 'admin.exhibitions.status.ongoing',
      [ExhibitionStatus.PAST]: 'admin.exhibitions.status.past'
    };
    return this.translateService.translate(keys[status] ?? status);
  }

  protected getStatusColor(status: ExhibitionStatus): string {
    return { [ExhibitionStatus.UPCOMING]: '#2196F3', [ExhibitionStatus.ONGOING]: '#4CAF50', [ExhibitionStatus.PAST]: '#9E9E9E' }[status] || '#9E9E9E';
  }

  protected getExhibitionSlug(): string {
    const editing = this.editingExhibition();
    const title = editing ? editing.title : (this.exhibitionForm.get('title')?.value || 'nouvelle-exposition');
    return this.generateSlug(title);
  }

  private generateSlug(title: string): string {
    return title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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

  protected exportData(): void {
    const lang = this.translateService.currentLang();
    const isEn = lang === 'en';
    const columns: ExportColumn<Exhibition>[] = [
      { header: 'ID', value: e => e.id },
      { header: isEn ? 'Title' : 'Titre', value: e => this.localeService.resolve(e, 'title') },
      { header: isEn ? 'Description' : 'Description', value: e => this.localeService.resolve(e, 'description') },
      { header: isEn ? 'Venue' : 'Lieu', value: e => e.location ?? '' },
      { header: isEn ? 'Address' : 'Adresse', value: e => e.address ?? '' },
      { header: isEn ? 'Start date' : 'Date début', value: e => e.startDate ? this.formatDate(e.startDate) : '' },
      { header: isEn ? 'End date' : 'Date fin', value: e => e.endDate ? this.formatDate(e.endDate) : '' },
      { header: isEn ? 'Status' : 'Statut', value: e => this.getStatusLabel(e.status) }
    ];
    this.exportService.exportToExcel(this.exhibitions(), columns, isEn ? 'exhibitions' : 'expositions');
  }

  private normalize(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
