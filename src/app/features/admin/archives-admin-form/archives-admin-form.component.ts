import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminService } from '@features/admin/services/admin.service';
import { NotificationService } from '@shared/services/notification.service';
import { HasUnsavedChanges } from '@features/admin/guards/unsaved-changes.guard';
import { Archive, ArchiveFile } from '@core/models/archive.model';
import { catchError, EMPTY } from 'rxjs';
import { ArchiveFileUploadComponent } from '@shared/components/archive-file-upload/archive-file-upload.component';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { TranslateService } from '@core/services/translate.service';
import { LocaleService } from '@core/services/locale.service';

@Component({
  selector: 'app-archives-admin-form',
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatCardModule, MatTooltipModule,
    ArchiveFileUploadComponent, TranslatePipe
  ],
  templateUrl: './archives-admin-form.component.html',
  styleUrl: './archives-admin-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchivesAdminFormComponent implements OnInit, HasUnsavedChanges {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translateService = inject(TranslateService);
  protected readonly localeService = inject(LocaleService);
  protected readonly lang = computed(() => this.translateService.currentLang());

  protected readonly editingArchive = signal<Archive | null>(null);
  protected readonly isSaving = signal(false);
  protected readonly pendingFiles = signal<{ fileType: ArchiveFile['fileType']; fileUrl: string; fileName: string }[]>([]);
  protected readonly showImageModal = signal(false);
  protected readonly modalImageUrl = signal('');
  protected readonly submitAttempted = signal(false);

  readonly hasUnsavedChanges = signal(false);
  readonly isFormMode = () => true;

  protected readonly thumbnailUrl = computed(() =>
    this.pendingFiles().find(f => f.fileType === 'IMAGE')?.fileUrl
  );

  protected readonly imageRequired = computed(() => this.submitAttempted() && !this.thumbnailUrl());

  protected readonly archiveForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    year: [null as number | null, [Validators.required, Validators.min(1900), Validators.max(2100)]],
    description: ['']
  });

  private readonly formValid = toSignal(this.archiveForm.statusChanges.pipe(
    map(status => status === 'VALID')
  ), { initialValue: this.archiveForm.valid });

  protected readonly isFormValidForSubmit = computed(() =>
    this.editingArchive()
      ? this.formValid() && (this.archiveForm.dirty || this.hasUnsavedChanges()) && !!this.thumbnailUrl()
      : this.formValid() && !!this.thumbnailUrl()
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.adminService.getArchives()
        .pipe(catchError(() => EMPTY))
        .subscribe(archives => {
          const archive = archives.find(a => a.id === +id);
          if (archive) this.fillForm(archive);
          this.archiveForm.markAsPristine();
          this.trackChanges();
        });
    } else {
      this.trackChanges();
    }
  }

  private trackChanges(): void {
    this.archiveForm.valueChanges.subscribe(() => this.hasUnsavedChanges.set(true));
  }

  private fillForm(archive: Archive): void {
    this.editingArchive.set(archive);
    this.archiveForm.patchValue({
      title: archive.title,
      year: archive.year,
      description: archive.description ?? ''
    });

    const files = archive.files?.map(f => ({
      fileType: f.fileType,
      fileUrl: f.fileUrl,
      fileName: f.fileName ?? ''
    })) ?? [];

    const images = files.filter(f => f.fileType === 'IMAGE');
    const others = files.filter(f => f.fileType !== 'IMAGE');

    if (images.length === 0 && archive.thumbnailUrl) {
      images.push({ fileType: 'IMAGE', fileUrl: archive.thumbnailUrl, fileName: 'Image principale' });
    } else if (archive.thumbnailUrl) {
      const thumbIndex = images.findIndex(f => f.fileUrl === archive.thumbnailUrl);
      if (thumbIndex > 0) {
        const [thumb] = images.splice(thumbIndex, 1);
        images.unshift(thumb);
      }
    }

    this.pendingFiles.set([...images, ...others]);
    this.archiveForm.markAsPristine();
    this.hasUnsavedChanges.set(false);
  }

  protected cancel(): void {
    this.router.navigate(['/admin/archives']);
  }

  protected onFilesChanged(files: { fileType: ArchiveFile['fileType']; fileUrl: string; fileName: string }[]): void {
    this.pendingFiles.set(files);
    this.hasUnsavedChanges.set(true);
  }

  protected openImageModal(url: string): void {
    this.modalImageUrl.set(url);
    this.showImageModal.set(true);
  }

  protected closeImageModal(): void {
    this.showImageModal.set(false);
  }

  protected saveArchive(): void {
    this.submitAttempted.set(true);
    if (this.archiveForm.invalid) return;
    if (!this.thumbnailUrl()) {
      this.notificationService.error(this.translateService.translate('admin.archives.mainImageRequired'));
      return;
    }
    this.isSaving.set(true);

    const { title, year, description } = this.archiveForm.value;
    const editing = this.editingArchive();
    const dto: Partial<Archive> = {
      title: title!,
      year: year!,
      description: description ?? undefined,
      thumbnailUrl: this.thumbnailUrl()!,
      files: this.pendingFiles().map(f => ({ ...f } as ArchiveFile))
    };

    const operation = editing
      ? this.adminService.updateArchive(editing.id, dto)
      : this.adminService.createArchive(dto);

    operation.pipe(
      catchError(() => {
        this.notificationService.error(this.translateService.translate('admin.archives.saveError'));
        this.isSaving.set(false);
        return EMPTY;
      })
    ).subscribe(() => {
      this.notificationService.success(
        this.translateService.translate(editing ? 'admin.archives.saveSuccess' : 'admin.archives.createSuccess')
      );
      this.isSaving.set(false);
      this.hasUnsavedChanges.set(false);
      this.router.navigate(['/admin/archives']);
    });
  }

  protected deleteArchive(id: number): void {
    this.confirmDialog.confirm({
      title: this.translateService.translate('admin.archives.deleteConfirmTitle'),
      message: this.translateService.translate('admin.archives.deleteConfirmMessage'),
      confirmLabel: this.translateService.translate('admin.common.delete'),
      cancelLabel: this.translateService.translate('admin.common.cancel')
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.adminService.deleteArchive(id)
        .pipe(catchError(() => {
          this.notificationService.error(this.translateService.translate('admin.archives.deleteError'));
          return EMPTY;
        }))
        .subscribe(() => {
          this.notificationService.success(this.translateService.translate('admin.archives.deleteSuccess'));
          this.hasUnsavedChanges.set(false);
          this.router.navigate(['/admin/archives']);
        });
    });
  }
}
