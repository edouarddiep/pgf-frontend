import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE, MAT_DATE_FORMATS, DateAdapter, NativeDateAdapter } from '@angular/material/core';
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
import { catchError, EMPTY, finalize } from 'rxjs';
import { Injectable } from '@angular/core';
import { LoadingDirective } from '@/app/directives/loading.directive';
import { HighlightPipe } from '@core/pipes/highlight.pipe';
import {HasUnsavedChanges} from '@features/admin/guards/unsaved-changes.guard';
import {ExportColumn, ExportService} from '@shared/services/export.service';
import {TranslatePipe} from '@core/pipes/translate.pipe';

interface ExhibitionFormData {
  title: string;
  description?: string;
  location: string;
  address?: string;
  startDate: Date | null;
  endDate: Date | null;
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
    HighlightPipe,
    TranslatePipe
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
export class ExhibitionsAdminManagementComponent implements OnInit, HasUnsavedChanges {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly exportService = inject(ExportService);

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
    address: [''],
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

  private loadExhibitions(): void {
    this.adminService.getExhibitions()
      .pipe(catchError(() => {
        this.notificationService.error('Erreur lors du chargement des expositions');
        return EMPTY;
      }))
      .subscribe(exhibitions => this.rawExhibitions.set(exhibitions));
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
    this.exhibitionForm.patchValue({
      title: exhibition.title,
      description: exhibition.description || '',
      location: exhibition.location,
      address: exhibition.address || '',
      startDate: exhibition.startDate ? new Date(exhibition.startDate) : null,
      endDate: exhibition.endDate ? new Date(exhibition.endDate) : null
    });

    const uniqueUrls = exhibition.imageUrls?.length
      ? Array.from(new Set(exhibition.imageUrls))
      : (exhibition.imageUrl ? [exhibition.imageUrl] : []);

    this.uploadedImageUrls.set(uniqueUrls);
    this.mainImageUrl.set(uniqueUrls[0]);
    this.uploadedVideoUrls.set(exhibition.videoUrls || []);
    this.hasUnsavedChanges.set(false);
  }

  protected sort(field: 'id' | 'title'): void {
    if (this.sortField() === field) {
      this.sortAsc.update(v => !v);
    } else {
      this.sortField.set(field);
      this.sortAsc.set(true);
    }
  }

  protected onImagesChanged(event: { urls: string[]; mainUrl: string | undefined }): void {
    this.uploadedImageUrls.set(event.urls);
    this.mainImageUrl.set(event.mainUrl);
    this.imageRequired.set(false);
    this.hasUnsavedChanges.set(true);
  }

  protected onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    const validFiles = Array.from(input.files).filter(f => {
      if (f.size > 500 * 1024 * 1024) { this.notificationService.error(`${f.name}: Vidéo trop volumineuse (max 500MB)`); return false; }
      if (!validTypes.includes(f.type)) { this.notificationService.error(`${f.name}: Seuls les formats MP4, MOV et AVI sont acceptés`); return false; }
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
        .pipe(catchError(() => { this.notificationService.error(`Erreur upload: ${files[uploadIndex].name}`); return EMPTY; }))
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
    this.imageRequired.set(this.uploadedImageUrls().length === 0);
    if (this.exhibitionForm.invalid || this.isSaving() || this.uploadedImageUrls().length === 0) return;

    this.isSaving.set(true);
    const formData = this.exhibitionForm.value as ExhibitionFormData;
    const imageUrls = this.uploadedImageUrls();
    const videoUrls = this.uploadedVideoUrls();

    const exhibitionData = {
      title: formData.title!,
      description: formData.description || undefined,
      location: formData.location!,
      address: formData.address || undefined,
      startDate: this.formatDateForBackend(formData.startDate!),
      endDate: formData.endDate ? this.formatDateForBackend(formData.endDate) : undefined,
      imageUrl: this.mainImageUrl() ?? imageUrls[0],
      imageUrls,
      videoUrls
    };

    const editing = this.editingExhibition();
    const operation = editing
      ? this.adminService.updateExhibition(editing.id, exhibitionData)
      : this.adminService.createExhibition(exhibitionData);

    operation
      .pipe(
        catchError(() => { this.notificationService.error('Erreur lors de la sauvegarde de l\'exposition'); return EMPTY; }),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe(() => {
        this.notificationService.success(editing ? 'Exposition modifiée avec succès' : 'Exposition créée avec succès');
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
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette exposition ?')) return;

    const exhibition = this.exhibitions().find(e => e.id === id);
    this.adminService.deleteExhibition(id)
      .pipe(catchError(() => { this.notificationService.error('Erreur lors de la suppression de l\'exposition'); return EMPTY; }))
      .subscribe(() => {
        exhibition?.imageUrls?.forEach(imageUrl =>
          this.adminService.deleteExhibitionImage(imageUrl).pipe(catchError(() => EMPTY)).subscribe()
        );
        this.notificationService.success('Exposition supprimée avec succès');
        this.loadExhibitions();
        window.dispatchEvent(new CustomEvent('exhibitionChanged'));
      });
  }

  protected formatDate(date: string | Date): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  protected getStatusLabel(status: ExhibitionStatus): string {
    return { [ExhibitionStatus.UPCOMING]: 'À venir', [ExhibitionStatus.ONGOING]: 'En cours', [ExhibitionStatus.PAST]: 'Passée' }[status] || status;
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
    const columns: ExportColumn<Exhibition>[] = [
      { header: 'ID', value: e => e.id },
      { header: 'Titre', value: e => e.title },
      { header: 'Lieu', value: e => e.location ?? '' },
      { header: 'Adresse', value: e => e.address ?? '' },
      { header: 'Date début', value: e => e.startDate ? this.formatDate(e.startDate) : '' },
      { header: 'Date fin', value: e => e.endDate ? this.formatDate(e.endDate) : '' },
      { header: 'Statut', value: e => this.getStatusLabel(e.status) }
    ];
    this.exportService.exportToExcel(this.exhibitions(), columns, 'expositions');
  }

  private normalize(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
