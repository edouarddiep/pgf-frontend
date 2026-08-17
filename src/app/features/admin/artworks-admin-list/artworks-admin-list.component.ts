import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminService } from '@features/admin/services/admin.service';
import { NotificationService } from '@shared/services/notification.service';
import { Artwork, ArtworkCategory } from '@core/models/artwork.model';
import { forkJoin, EMPTY, catchError, finalize } from 'rxjs';
import { LoadingDirective } from '@/app/directives/loading.directive';
import { SortableDirective } from '@/app/directives/sortable.directive';
import { TextTooltipDirective } from '@/app/directives/text-tooltip.directive';
import { HighlightPipe } from '@core/pipes/highlight.pipe';
import { ExportColumn, ExportService } from '@shared/services/export.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { MediaLightboxComponent } from '@shared/components/media-lightbox/media-lightbox.component';
import { TranslateService } from '@core/services/translate.service';
import { LocaleService } from '@core/services/locale.service';
import { TruncatePipe } from '@core/pipes/truncate.pipe';
import { ArtworksAdminStateService } from '@features/admin/services/artworks-admin-state.service';

type SortField = 'id' | 'title';

@Component({
  selector: 'app-artworks-admin-list',
  imports: [
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    LoadingDirective,
    SortableDirective,
    TextTooltipDirective,
    HighlightPipe,
    TranslatePipe,
    LoadingSpinnerComponent,
    MediaLightboxComponent,
    TruncatePipe
],
  templateUrl: './artworks-admin-list.component.html',
  styleUrl: './artworks-admin-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworksAdminListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly exportService = inject(ExportService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translateService = inject(TranslateService);
  private readonly stateService = inject(ArtworksAdminStateService);
  protected readonly localeService = inject(LocaleService);
  protected readonly lang = computed(() => this.translateService.currentLang());

  protected readonly artworks = signal<Artwork[]>([]);
  protected readonly categories = signal<ArtworkCategory[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly modalImageUrl = signal<string | null>(null);
  protected readonly highlightedId = signal<number | null>(null);

  protected readonly displayedColumns = ['id', 'image', 'title', 'categories', 'actions'];

  protected readonly sortField = signal<SortField>('id');
  protected readonly sortAsc = signal(true);
  protected readonly searchQuery = signal('');
  protected readonly selectedCategoryFilter = signal<string>('');

  // Recherche, filtre catégorie et tri sont appliqués localement : aucune
  // requête réseau n'est déclenchée pendant la saisie.
  protected readonly filteredArtworks = computed(() => {
    const field = this.sortField();
    const asc = this.sortAsc();
    const categoryId = this.selectedCategoryFilter();
    const tokens = this.normalize(this.searchQuery().trim()).split(/\s+/).filter(token => token.length > 0);

    let base = this.artworks();

    if (categoryId) {
      base = base.filter(artwork => (artwork.categoryIds ?? []).some(id => id === +categoryId));
    }

    if (tokens.length > 0) {
      base = base.filter(artwork =>
        tokens.every(token =>
          artwork.id?.toString().includes(token) ||
          this.normalize(artwork.title ?? '').includes(token)
        )
      );
    }

    return [...base].sort((a, b) => {
      const va = field === 'id' ? a.id : this.normalize(a.title ?? '');
      const vb = field === 'id' ? b.id : this.normalize(b.title ?? '');
      return asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  });

  ngOnInit(): void {
    const state = this.stateService.state();
    this.sortField.set(state.sortField);
    this.sortAsc.set(state.sortAsc);
    this.searchQuery.set(state.searchQuery);
    this.selectedCategoryFilter.set(state.selectedCategoryFilter);
    this.loadData(state.anchorId);
  }

  private loadData(anchorId: number | null = null): void {
    this.isLoading.set(true);
    forkJoin({
      artworks: this.adminService.getArtworks(),
      categories: this.adminService.getCategories()
    })
      .pipe(
        catchError(() => {
          this.notificationService.error(this.translateService.translate('admin.artworks.loadError'));
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(({ artworks, categories }) => {
        this.artworks.set(artworks);
        this.categories.set(categories);
        this.scrollToAnchor(anchorId);
      });
  }

  private scrollToAnchor(anchorId: number | null): void {
    if (anchorId === null) return;
    this.stateService.clearAnchor();
    setTimeout(() => {
      document.getElementById(`artwork-row-${anchorId}`)?.scrollIntoView({ block: 'center', behavior: 'instant' });
      this.highlightedId.set(anchorId);
      setTimeout(() => this.highlightedId.set(null), 2000);
    }, 50);
  }

  protected editArtwork(artwork: Artwork): void {
    this.stateService.save({
      sortField: this.sortField(),
      sortAsc: this.sortAsc(),
      searchQuery: this.searchQuery(),
      selectedCategoryFilter: this.selectedCategoryFilter(),
      anchorId: artwork.id
    });
    this.router.navigate(['/admin/artworks', artwork.id, 'edit']);
  }

  protected deleteArtwork(id: number): void {
    this.confirmDialog.confirm({
      title: this.translateService.translate('admin.artworks.deleteConfirmTitle'),
      message: this.translateService.translate('admin.artworks.deleteConfirmMessage'),
      confirmLabel: this.translateService.translate('admin.common.delete'),
      cancelLabel: this.translateService.translate('admin.common.cancel')
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.adminService.deleteArtwork(id)
        .pipe(catchError(() => {
          this.notificationService.error(this.translateService.translate('admin.artworks.deleteError'));
          return EMPTY;
        }))
        .subscribe(() => {
          this.notificationService.success(this.translateService.translate('admin.artworks.deleteSuccess'));
          window.dispatchEvent(new CustomEvent('artworkChanged'));
          this.loadData();
        });
    });
  }

  protected sort(field: string): void {
    if (this.sortField() === field) {
      this.sortAsc.update(v => !v);
    } else {
      this.sortField.set(field as SortField);
      this.sortAsc.set(true);
    }
  }

  protected onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  protected onCategoryFilterChange(value: string): void {
    this.selectedCategoryFilter.set(value);
  }

  protected getCategoryNames(categoryIds?: number[]): string[] {
    if (!categoryIds || categoryIds.length === 0) return [];
    return categoryIds
      .map(id => {
        const category = this.categories().find(c => c.id === id);
        return category ? this.localeService.resolve(category, 'name') : null;
      })
      .filter((name): name is string => !!name);
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
    const columns: ExportColumn<Artwork>[] = [
      { header: 'ID', value: a => a.id },
      { header: isEn ? 'Title' : 'Titre', value: a => this.localeService.resolve(a, 'title') },
      { header: isEn ? 'Description' : 'Description', value: a => this.localeService.resolve(a, 'description') },
      { header: isEn ? 'Categories' : 'Catégories', value: a => this.getCategoryNames(a.categoryIds).join(', ') }
    ];
    this.exportService.exportToExcel(this.filteredArtworks(), columns, isEn ? 'artworks' : 'oeuvres');
  }

  private normalize(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
