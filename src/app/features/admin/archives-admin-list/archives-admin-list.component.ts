import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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
import { Archive } from '@core/models/archive.model';
import { catchError, EMPTY } from 'rxjs';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';
import { TranslateService } from '@core/services/translate.service';
import { LocaleService } from '@core/services/locale.service';
import { TruncatePipe } from '@core/pipes/truncate.pipe';
import { ArchivesAdminStateService } from '@features/admin/services/archives-admin-state.service';

type SortField = 'id' | 'title' | 'year';

@Component({
  selector: 'app-archives-admin-list',
  imports: [
    CommonModule, RouterLink, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatCardModule, MatTooltipModule,
    LoadingDirective, HighlightPipe, TranslatePipe, TruncatePipe
  ],
  templateUrl: './archives-admin-list.component.html',
  styleUrl: './archives-admin-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchivesAdminListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly exportService = inject(ExportService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translateService = inject(TranslateService);
  private readonly stateService = inject(ArchivesAdminStateService);
  protected readonly localeService = inject(LocaleService);
  protected readonly lang = computed(() => this.translateService.currentLang());

  private readonly rawArchives = signal<Archive[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly sortField = signal<SortField>('id');
  protected readonly sortAsc = signal(true);
  protected readonly showImageModal = signal(false);
  protected readonly modalImageUrl = signal('');
  protected readonly tooltipText = signal<string>('');
  protected readonly tooltipX = signal(0);
  protected readonly tooltipY = signal(0);
  protected readonly highlightedId = signal<number | null>(null);
  protected readonly displayedColumns = ['id', 'thumbnail', 'title', 'year', 'actions'];

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

  ngOnInit(): void {
    const state = this.stateService.state();
    this.sortField.set(state.sortField);
    this.sortAsc.set(state.sortAsc);
    this.searchQuery.set(state.searchQuery);
    this.loadArchives(state.anchorId);
  }

  private loadArchives(anchorId: number | null = null): void {
    this.adminService.getArchives()
      .pipe(catchError(() => {
        this.notificationService.error(this.translateService.translate('admin.archives.loadError'));
        return EMPTY;
      }))
      .subscribe(archives => {
        this.rawArchives.set(archives);
        this.scrollToAnchor(anchorId);
      });
  }

  private scrollToAnchor(anchorId: number | null): void {
    if (anchorId === null) return;
    this.stateService.clearAnchor();
    setTimeout(() => {
      document.getElementById(`archive-row-${anchorId}`)?.scrollIntoView({ block: 'center', behavior: 'instant' });
      this.highlightedId.set(anchorId);
      setTimeout(() => this.highlightedId.set(null), 2000);
    }, 50);
  }

  protected editArchive(archive: Archive): void {
    this.stateService.save({
      sortField: this.sortField(),
      sortAsc: this.sortAsc(),
      searchQuery: this.searchQuery(),
      anchorId: archive.id
    });
    this.router.navigate(['/admin/archives', archive.id, 'edit']);
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
          this.loadArchives();
        });
    });
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

  protected openImageModal(url: string): void {
    this.modalImageUrl.set(url);
    this.showImageModal.set(true);
  }

  protected closeImageModal(): void {
    this.showImageModal.set(false);
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

  protected exportData(): void {
    const lang = this.translateService.currentLang();
    const isEn = lang === 'en';
    const columns: ExportColumn<Archive>[] = [
      { header: 'ID', value: a => a.id },
      { header: isEn ? 'Title' : 'Titre', value: a => this.localeService.resolve(a, 'title') },
      { header: isEn ? 'Year' : 'Année', value: a => a.year },
      { header: isEn ? 'Description' : 'Description', value: a => this.localeService.resolve(a, 'description') },
      { header: isEn ? 'Files' : 'Nb fichiers', value: a => a.files?.length ?? 0 }
    ];
    this.exportService.exportToExcel(this.archives(), columns, isEn ? 'archives' : 'archives');
  }

  private normalize(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
