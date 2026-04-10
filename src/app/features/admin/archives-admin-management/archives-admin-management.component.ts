import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminService } from '@features/admin/services/admin.service';
import { NotificationService } from '@shared/services/notification.service';
import { ExportColumn, ExportService } from '@shared/services/export.service';
import { LoadingDirective } from '@/app/directives/loading.directive';
import { HighlightPipe } from '@core/pipes/highlight.pipe';
import { HasUnsavedChanges } from '@features/admin/guards/unsaved-changes.guard';
import { Archive, ArchiveFile } from '@core/models/archive.model';
import { catchError, EMPTY } from 'rxjs';
import { ArchiveFileUploadComponent } from '@shared/components/archive-file-upload/archive-file-upload.component';
import {TranslatePipe} from '@core/pipes/translate.pipe';

type SortField = 'id' | 'title' | 'year';

@Component({
  selector: 'app-archives-admin-management',
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatCardModule, MatTooltipModule,
    LoadingDirective, HighlightPipe, ArchiveFileUploadComponent, TranslatePipe
  ],
  templateUrl: './archives-admin-management.component.html',
  styleUrl: './archives-admin-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchivesAdminManagementComponent implements OnInit, HasUnsavedChanges {
  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly exportService = inject(ExportService);

  private readonly rawArchives = signal<Archive[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly sortField = signal<SortField>('id');
  protected readonly sortAsc = signal(true);
  protected readonly editingArchive = signal<Archive | null>(null);
  protected readonly isSaving = signal(false);
  protected readonly pendingFiles = signal<{ fileType: ArchiveFile['fileType']; fileUrl: string; fileName: string }[]>([]);
  protected readonly showImageModal = signal(false);
  protected readonly modalImageUrl = signal('');
  protected readonly tooltipText = signal('');
  protected readonly tooltipX = signal(0);
  protected readonly tooltipY = signal(0);

  readonly hasUnsavedChanges = signal(false);
  readonly isFormMode = signal(false);

  protected readonly displayedColumns = ['id', 'thumbnail', 'title', 'year', 'actions'];

  protected readonly thumbnailUrl = computed(() =>
    this.pendingFiles().find(f => f.fileType === 'IMAGE')?.fileUrl
  );

  protected readonly imageRequired = computed(() => !this.thumbnailUrl());

  protected readonly archives = computed(() => {
    const field = this.sortField();
    const asc = this.sortAsc();
    const query = this.normalize(this.searchQuery().trim());
    const tokens = query.split(/\s+/).filter(t => t.length >= 1);

    let base = this.rawArchives();
    if (tokens.length > 0) {
      base = base.filter(a =>
        tokens.every(token =>
          a.id?.toString().includes(token) ||
          this.normalize(a.title ?? '').includes(token) ||
          a.year?.toString().includes(token) ||
          this.normalize(a.description ?? '').includes(token)
        )
      );
    }

    return [...base].sort((a, b) => {
      const va = field === 'id' ? a.id : field === 'year' ? a.year : this.normalize(a.title ?? '');
      const vb = field === 'id' ? b.id : field === 'year' ? b.year : this.normalize(b.title ?? '');
      return asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  });

  protected readonly archiveForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(1900), Validators.max(2100)]],
    description: ['']
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const url = this.router.url;
    const isCreate = url.endsWith('/create');
    const isEdit = !!id && url.endsWith('/edit');

    if (isCreate || isEdit) {
      this.isFormMode.set(true);
      if (isEdit) {
        this.adminService.getArchives()
          .pipe(catchError(() => EMPTY))
          .subscribe(archives => {
            const archive = archives.find(a => a.id === +id!);
            if (archive) this.fillForm(archive);
            this.archiveForm.markAsPristine();
            this.archiveForm.valueChanges.subscribe(() => {
              if (this.isFormMode()) this.hasUnsavedChanges.set(true);
            });
          });
      } else {
        this.archiveForm.valueChanges.subscribe(() => {
          if (this.isFormMode()) this.hasUnsavedChanges.set(true);
        });
      }
    } else {
      this.loadArchives();
    }
  }

  private loadArchives(): void {
    this.adminService.getArchives()
      .pipe(catchError(() => {
        this.notificationService.error('Erreur lors du chargement des archives');
        return EMPTY;
      }))
      .subscribe(archives => this.rawArchives.set(archives));
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
    this.pendingFiles.set([...images, ...others]);
  }

  protected sort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortAsc.update(v => !v);
    } else {
      this.sortField.set(field);
      this.sortAsc.set(true);
    }
  }

  protected onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  protected showCreateForm(): void {
    this.router.navigate(['/admin/archives/create']);
  }

  protected showEditForm(archive: Archive): void {
    this.router.navigate(['/admin/archives', archive.id, 'edit']);
  }

  protected showList(): void {
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
    if (this.archiveForm.invalid) return;
    if (!this.thumbnailUrl()) {
      this.notificationService.error('Une image principale est obligatoire');
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
      files: this.pendingFiles().map((f, i) => ({ id: editing?.files?.[i]?.id, ...f } as ArchiveFile))
    };

    const operation = editing
      ? this.adminService.updateArchive(editing.id, dto)
      : this.adminService.createArchive(dto);

    operation.pipe(
      catchError(err => {
        this.notificationService.error(err?.error?.message || 'Erreur lors de la sauvegarde');
        this.isSaving.set(false);
        return EMPTY;
      })
    ).subscribe(() => {
      this.notificationService.success(editing ? 'Archive modifiée avec succès' : 'Archive créée avec succès');
      this.isSaving.set(false);
      this.hasUnsavedChanges.set(false);
      this.router.navigate(['/admin/archives']);
    });
  }

  protected deleteArchive(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette archive ?')) return;
    this.adminService.deleteArchive(id)
      .pipe(catchError(() => {
        this.notificationService.error('Erreur lors de la suppression');
        return EMPTY;
      }))
      .subscribe(() => {
        this.notificationService.success('Archive supprimée');
        this.loadArchives();
      });
  }

  protected exportData(): void {
    const columns: ExportColumn<Archive>[] = [
      { header: 'ID', value: a => a.id },
      { header: 'Titre', value: a => a.title },
      { header: 'Année', value: a => a.year },
      { header: 'Description', value: a => a.description ?? '' },
      { header: 'Nb fichiers', value: a => a.files?.length ?? 0 }
    ];
    this.exportService.exportToExcel(this.archives(), columns, 'archives');
  }

  protected showTooltip(event: MouseEvent, text: string): void {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.tooltipText.set(text);
    this.tooltipX.set(rect.left + rect.width / 2 - 210);
    this.tooltipY.set(rect.top - 8);
  }

  protected hideTooltip(): void {
    this.tooltipText.set('');
  }

  private normalize(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
