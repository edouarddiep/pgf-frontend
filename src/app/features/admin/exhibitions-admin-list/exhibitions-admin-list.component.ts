import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';

import {Router, RouterLink} from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminService } from '@features/admin/services/admin.service';
import { NotificationService } from '@shared/services/notification.service';
import { Exhibition, ExhibitionStatus } from '@core/models/exhibition.model';
import { catchError, EMPTY, finalize } from 'rxjs';
import { LoadingDirective } from '@/app/directives/loading.directive';
import { SortableDirective } from '@/app/directives/sortable.directive';
import { TextTooltipDirective } from '@/app/directives/text-tooltip.directive';
import { MediaLightboxComponent } from '@shared/components/media-lightbox/media-lightbox.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { HighlightPipe } from '@core/pipes/highlight.pipe';
import { ExportColumn, ExportService } from '@shared/services/export.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';
import { TranslateService } from '@core/services/translate.service';
import { LocaleService } from '@core/services/locale.service';
import { TruncatePipe } from '@core/pipes/truncate.pipe';
import { ExhibitionSortField, ExhibitionsAdminStateService } from '@features/admin/services/exhibitions-admin-state.service';

const STATUS_ORDER: Record<ExhibitionStatus, number> = {
  [ExhibitionStatus.ONGOING]: 0,
  [ExhibitionStatus.UPCOMING]: 1,
  [ExhibitionStatus.PAST]: 2
};

@Component({
  selector: 'app-exhibitions-admin-list',
  imports: [
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    LoadingDirective,
    SortableDirective,
    TextTooltipDirective,
    MediaLightboxComponent,
    LoadingSpinnerComponent,
    HighlightPipe,
    TranslatePipe,
    TruncatePipe
],
  templateUrl: './exhibitions-admin-list.component.html',
  styleUrl: './exhibitions-admin-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExhibitionsAdminListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly exportService = inject(ExportService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translateService = inject(TranslateService);
  private readonly stateService = inject(ExhibitionsAdminStateService);
  protected readonly localeService = inject(LocaleService);
  protected readonly lang = computed(() => this.translateService.currentLang());

  protected readonly rawExhibitions = signal<Exhibition[]>([]);
  protected readonly modalImageUrl = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly searchQuery = signal('');
  protected readonly sortField = signal<ExhibitionSortField>('date');
  protected readonly sortAsc = signal(true);
  protected readonly highlightedId = signal<number | null>(null);
  protected readonly displayedColumns = ['id', 'image', 'title', 'location', 'status', 'actions'];

  protected readonly exhibitions = computed(() => {
    const field = this.sortField();
    const asc = this.sortAsc();
    const query = this.normalize(this.searchQuery().trim());
    const tokens = query.split(/\s+/).filter(t => t.length >= 1);

    let base = this.rawExhibitions();
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
      const comparison = field === 'date' ? this.compareByStatusThenDate(a, b) : this.compareByField(a, b, field);
      return asc ? comparison : -comparison;
    });
  });

  // Ordre de travail du back-office : les expositions en cours d'abord, puis
  // celles à venir (la plus proche en tête) et enfin les passées (la plus
  // récente en tête), comme le fait déjà l'API pour le site public.
  private compareByStatusThenDate(a: Exhibition, b: Exhibition): number {
    const rankDiff = STATUS_ORDER[a.status ?? ExhibitionStatus.PAST] - STATUS_ORDER[b.status ?? ExhibitionStatus.PAST];
    if (rankDiff !== 0) {
      return rankDiff;
    }
    const dateDiff = this.startTime(a) - this.startTime(b);
    if (a.status === ExhibitionStatus.UPCOMING) {
      return dateDiff;
    }
    return -dateDiff;
  }

  private compareByField(a: Exhibition, b: Exhibition, field: ExhibitionSortField): number {
    const va = field === 'id' ? a.id : this.normalize(a.title ?? '');
    const vb = field === 'id' ? b.id : this.normalize(b.title ?? '');
    if (va === vb) {
      return 0;
    }
    return va > vb ? 1 : -1;
  }

  private startTime(exhibition: Exhibition): number {
    if (!exhibition.startDate) {
      return 0;
    }
    return new Date(exhibition.startDate).getTime();
  }

  ngOnInit(): void {
    const state = this.stateService.state();
    this.sortField.set(state.sortField);
    this.sortAsc.set(state.sortAsc);
    this.searchQuery.set(state.searchQuery);
    this.loadExhibitions(state.anchorId);
  }

  private loadExhibitions(anchorId: number | null = null): void {
    this.isLoading.set(true);
    this.adminService.getExhibitions()
      .pipe(
        catchError(() => {
          this.notificationService.error(this.translateService.translate('admin.exhibitions.loadError'));
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(exhibitions => {
        this.rawExhibitions.set(exhibitions);
        this.scrollToAnchor(anchorId);
      });
  }

  private scrollToAnchor(anchorId: number | null): void {
    if (anchorId === null) return;
    this.stateService.clearAnchor();
    setTimeout(() => {
      document.getElementById(`exhibition-row-${anchorId}`)?.scrollIntoView({ block: 'center', behavior: 'instant' });
      this.highlightedId.set(anchorId);
      setTimeout(() => this.highlightedId.set(null), 2000);
    }, 50);
  }

  protected editExhibition(exhibition: Exhibition): void {
    this.stateService.save({
      sortField: this.sortField(),
      sortAsc: this.sortAsc(),
      searchQuery: this.searchQuery(),
      anchorId: exhibition.id
    });
    this.router.navigate(['/admin/exhibitions', exhibition.id, 'edit']);
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

  protected sort(field: string): void {
    if (this.sortField() === field) {
      this.sortAsc.update(v => !v);
    } else {
      this.sortField.set(field as ExhibitionSortField);
      this.sortAsc.set(true);
    }
  }

  protected onSearchChange(value: string): void {
    this.searchQuery.set(value);
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

  protected formatDate(date: string | Date): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  protected openImageModal(url: string): void {
    this.modalImageUrl.set(url);
  }

  protected closeImageModal(): void {
    this.modalImageUrl.set(null);
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
