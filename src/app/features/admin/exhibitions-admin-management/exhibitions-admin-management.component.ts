import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
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
import { AdminService } from '@features/admin/services/admin.service';
import { Exhibition, ExhibitionStatus } from '@core/models/exhibition.model';
import { ImageUploadComponent } from '@shared/components/image-upload/image-upload.component';
import { NotificationService } from '@shared/services/notification.service';
import { catchError, EMPTY, fromEvent, finalize } from 'rxjs';
import { Injectable } from '@angular/core';
import {LoadingDirective} from '@/app/directives/loading.directive';

interface ExhibitionFormData {
  title: string;
  description?: string;
  location: string;
  address?: string;
  startDate: Date | null;
  endDate: Date | null;
}

type ViewMode = 'list' | 'create' | 'edit';

@Injectable()
export class SwissDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    if (!date || isNaN(date.getTime())) return '';

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  override parse(value: string): Date | null {
    if (!value || value.trim() === '') return null;

    const parts = value.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);

      if (!isNaN(day) && !isNaN(month) && !isNaN(year) &&
        day > 0 && day <= 31 && month >= 0 && month <= 11 && year > 1900) {
        const date = new Date(year, month, day);
        if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
          return date;
        }
      }
    }

    return null;
  }
}

const SWISS_DATE_FORMATS = {
  parse: {
    dateInput: 'DD.MM.YYYY',
  },
  display: {
    dateInput: 'DD.MM.YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD.MM.YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

function endDateValidator(control: AbstractControl) {
  const startDate = control.get('startDate')?.value;
  const endDate = control.get('endDate')?.value;

  if (!startDate || !endDate) return null;

  return new Date(endDate) < new Date(startDate)
    ? { endDateBeforeStart: true }
    : null;
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
    ImageUploadComponent,
    LoadingDirective
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'de-CH' },
    { provide: MAT_DATE_FORMATS, useValue: SWISS_DATE_FORMATS },
    { provide: DateAdapter, useClass: SwissDateAdapter }
  ],
  templateUrl: './exhibitions-admin-management.component.html',
  styleUrl: './exhibitions-admin-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExhibitionsAdminManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);

  protected readonly currentMode = signal<ViewMode>('list');
  protected readonly exhibitions = signal<Exhibition[]>([]);
  protected readonly editingExhibition = signal<Exhibition | null>(null);
  protected readonly uploadedImageUrls = signal<string[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly uploadedVideoUrls = signal<string[]>([]);
  protected readonly uploadingVideos = signal(false);

  protected readonly exhibitionForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    location: ['', [Validators.required, Validators.minLength(2)]],
    address: [''],
    startDate: [null as Date | null, [Validators.required]],
    endDate: [null as Date | null]
  }, { validators: endDateValidator });

  ngOnInit(): void {
    this.loadExhibitions();

    fromEvent(window, 'exhibitionChanged').subscribe(() => {
      this.loadExhibitions();
    });
  }

  private loadExhibitions(): void {
    this.adminService.getExhibitions()
      .pipe(catchError(() => {
        this.notificationService.error('Erreur lors du chargement des expositions');
        return EMPTY;
      }))
      .subscribe(exhibitions => {
        this.exhibitions.set(exhibitions);
      });
  }

  protected showCreateForm(): void {
    this.currentMode.set('create');
    this.editingExhibition.set(null);
    this.resetForm();
  }

  protected showEditForm(exhibition: Exhibition): void {
    this.currentMode.set('edit');
    this.editingExhibition.set(exhibition);
    this.fillForm(exhibition);
  }

  protected showList(): void {
    this.currentMode.set('list');
    this.editingExhibition.set(null);
    this.resetForm();
  }

  private resetForm(): void {
    this.exhibitionForm.reset({
      title: '',
      description: '',
      location: '',
      address: '',
      startDate: null,
      endDate: null
    });
    this.uploadedImageUrls.set([]);
    this.uploadedVideoUrls.set([]);
  }

  private fillForm(exhibition: Exhibition): void {
    this.exhibitionForm.patchValue({
      title: exhibition.title,
      description: exhibition.description || '',
      location: exhibition.location,
      address: exhibition.address || '',
      startDate: exhibition.startDate ? new Date(exhibition.startDate) : null,
      endDate: exhibition.endDate ? new Date(exhibition.endDate) : null
    });

    const uniqueUrls = exhibition.imageUrls && exhibition.imageUrls.length > 0
      ? Array.from(new Set(exhibition.imageUrls))
      : (exhibition.imageUrl ? [exhibition.imageUrl] : []);

    this.uploadedImageUrls.set(uniqueUrls);
    this.uploadedVideoUrls.set(exhibition.videoUrls || []);
  }

  protected onImagesUploaded(imageUrls: string[]): void {
    this.uploadedImageUrls.update(existing => [...existing, ...imageUrls]);
  }

  protected onImageRemoved(imageUrl: string): void {
    this.uploadedImageUrls.update(urls => urls.filter(url => url !== imageUrl));
  }

  protected onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);

    for (const file of files) {
      if (file.size > 500 * 1024 * 1024) {
        this.notificationService.error(`${file.name}: Vidéo trop volumineuse (max 500MB)`);
        continue;
      }

      if (file.type !== 'video/mp4') {
        this.notificationService.error(`${file.name}: Seuls les fichiers MP4 sont acceptés`);
        continue;
      }
    }

    this.uploadVideos(files.filter(f => f.type === 'video/mp4' && f.size <= 500 * 1024 * 1024));
    input.value = '';
  }

  private uploadVideos(files: File[]): void {
    if (files.length === 0) return;

    this.uploadingVideos.set(true);
    const exhibitionSlug = this.getExhibitionSlug();
    const startIndex = this.uploadedVideoUrls().length;

    let uploadIndex = 0;
    const processNext = () => {
      if (uploadIndex >= files.length) {
        this.uploadingVideos.set(false);
        return;
      }

      const videoIndex = startIndex + uploadIndex + 1;
      this.adminService.uploadExhibitionVideo(files[uploadIndex], exhibitionSlug, videoIndex)
        .pipe(catchError(() => {
          this.notificationService.error(`Erreur upload: ${files[uploadIndex].name}`);
          return EMPTY;
        }))
        .subscribe(result => {
          this.uploadedVideoUrls.update(urls => [...urls, result.videoUrl]);
          uploadIndex++;
          processNext();
        });
    };

    processNext();
  }

  protected removeVideo(index: number): void {
    this.uploadedVideoUrls.update(urls => urls.filter((_, i) => i !== index));
  }

  protected saveExhibition(): void {
    if (this.exhibitionForm.invalid || this.isSaving()) return;

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
      imageUrl: imageUrls.length > 0 ? imageUrls[0] : undefined,
      imageUrls: imageUrls,
      videoUrls: videoUrls
    };

    const editing = this.editingExhibition();
    const operation = editing
      ? this.adminService.updateExhibition(editing.id, exhibitionData)
      : this.adminService.createExhibition(exhibitionData);

    operation
      .pipe(
        catchError(() => {
          this.notificationService.error('Erreur lors de la sauvegarde de l\'exposition');
          return EMPTY;
        }),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe(() => {
        const message = editing ? 'Exposition modifiée avec succès' : 'Exposition créée avec succès';
        this.notificationService.success(message);
        this.showList();
        this.loadExhibitions();
        window.dispatchEvent(new CustomEvent('exhibitionChanged'));
      });
  }

  private formatDateForBackend(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected deleteExhibition(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette exposition ?')) {
      return;
    }

    const exhibition = this.exhibitions().find(e => e.id === id);

    this.adminService.deleteExhibition(id)
      .pipe(
        catchError(() => {
          this.notificationService.error('Erreur lors de la suppression de l\'exposition');
          return EMPTY;
        })
      )
      .subscribe(() => {
        if (exhibition?.imageUrls) {
          exhibition.imageUrls.forEach(imageUrl => {
            this.adminService.deleteExhibitionImage(imageUrl)
              .pipe(catchError(() => EMPTY))
              .subscribe();
          });
        }
        this.notificationService.success('Exposition supprimée avec succès');
        this.loadExhibitions();
        window.dispatchEvent(new CustomEvent('exhibitionChanged'));
      });
  }

  protected formatDate(date: string | Date): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  protected getStatusLabel(status: ExhibitionStatus): string {
    const labels = {
      [ExhibitionStatus.UPCOMING]: 'À venir',
      [ExhibitionStatus.ONGOING]: 'En cours',
      [ExhibitionStatus.PAST]: 'Passée'
    };
    return labels[status] || status;
  }

  protected getStatusColor(status: ExhibitionStatus): string {
    const colors = {
      [ExhibitionStatus.UPCOMING]: '#2196F3',
      [ExhibitionStatus.ONGOING]: '#4CAF50',
      [ExhibitionStatus.PAST]: '#9E9E9E'
    };
    return colors[status] || '#9E9E9E';
  }

  protected getExhibitionSlug(): string {
    const editing = this.editingExhibition();
    if (editing) {
      return this.generateSlug(editing.title);
    }
    const title = this.exhibitionForm.get('title')?.value;
    return title ? this.generateSlug(title) : 'nouvelle-exposition';
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
