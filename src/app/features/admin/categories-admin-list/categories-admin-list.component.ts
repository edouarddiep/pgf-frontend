import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { AdminService } from '@features/admin/services/admin.service';
import { NotificationService } from '@shared/services/notification.service';
import { ArtworkCategory } from '@core/models/artwork.model';
import { catchError, EMPTY, forkJoin } from 'rxjs';
import { LoadingDirective } from '@/app/directives/loading.directive';
import { HighlightPipe } from '@core/pipes/highlight.pipe';
import { ExportColumn, ExportService } from '@shared/services/export.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { TranslateService } from '@core/services/translate.service';
import { LocaleService } from '@core/services/locale.service';
import { TruncatePipe } from '@core/pipes/truncate.pipe';
import { CategoriesAdminStateService } from '@features/admin/services/categories-admin-state.service';

type SortField = 'id' | 'name';

@Component({
  selector: 'app-categories-admin-list',
  imports: [
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltip,
    LoadingDirective,
    HighlightPipe,
    TranslatePipe,
    TruncatePipe
],
  templateUrl: './categories-admin-list.component.html',
  styleUrl: './categories-admin-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesAdminListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly exportService = inject(ExportService);
  private readonly translateService = inject(TranslateService);
  private readonly stateService = inject(CategoriesAdminStateService);
  protected readonly localeService = inject(LocaleService);
  protected readonly lang = computed(() => this.translateService.currentLang());

  private readonly rawCategories = signal<ArtworkCategory[]>([]);
  protected readonly sortField = signal<SortField>('id');
  protected readonly sortAsc = signal(true);
  protected readonly searchQuery = signal('');
  protected readonly showImageModal = signal(false);
  protected readonly modalImageUrl = signal<string>('');
  protected readonly tooltipText = signal<string>('');
  protected readonly tooltipX = signal(0);
  protected readonly tooltipY = signal(0);
  protected readonly highlightedId = signal<number | null>(null);
  protected readonly displayedColumns = ['id', 'image', 'name', 'description', 'artworkCount', 'actions'];

  protected readonly categories = computed(() => {
    const field = this.sortField();
    const asc = this.sortAsc();
    const query = this.normalize(this.searchQuery().trim());
    const tokens = query.split(/\s+/).filter(t => t.length >= 1);

    let base = this.rawCategories();
    if (tokens.length > 0) {
      base = base.filter(c =>
        tokens.every(token =>
          c.id?.toString().includes(token) ||
          this.normalize(c.name ?? '').includes(token) ||
          this.normalize(c.description ?? '').includes(token)
        )
      );
    }

    return [...base].sort((a, b) => {
      const va = field === 'id' ? a.id : this.normalize(a.name ?? '');
      const vb = field === 'id' ? b.id : this.normalize(b.name ?? '');
      return asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  });

  ngOnInit(): void {
    const state = this.stateService.state();
    this.sortField.set(state.sortField);
    this.sortAsc.set(state.sortAsc);
    this.searchQuery.set(state.searchQuery);
    this.loadCategories(state.anchorId);
  }

  private loadCategories(anchorId: number | null = null): void {
    forkJoin({ categories: this.adminService.getCategories(), artworks: this.adminService.getArtworks() })
      .pipe(catchError(() => {
        this.notificationService.error(this.translateService.translate('admin.categories.loadError'));
        return EMPTY;
      }))
      .subscribe(({ categories, artworks }) => {
        this.rawCategories.set(categories.map(c => ({
          ...c,
          artworkCount: artworks.filter(a => a.categoryIds?.includes(c.id)).length
        })));
        this.scrollToAnchor(anchorId);
      });
  }

  private scrollToAnchor(anchorId: number | null): void {
    if (anchorId === null) return;
    this.stateService.clearAnchor();
    setTimeout(() => {
      document.getElementById(`category-row-${anchorId}`)?.scrollIntoView({ block: 'center', behavior: 'instant' });
      this.highlightedId.set(anchorId);
      setTimeout(() => this.highlightedId.set(null), 2000);
    }, 50);
  }

  protected editCategory(category: ArtworkCategory): void {
    this.stateService.save({
      sortField: this.sortField(),
      sortAsc: this.sortAsc(),
      searchQuery: this.searchQuery(),
      anchorId: category.id
    });
    this.router.navigate(['/admin/categories', category.id, 'edit']);
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
    const columns: ExportColumn<ArtworkCategory>[] = [
      { header: 'ID', value: c => c.id },
      { header: isEn ? 'Name' : 'Nom', value: c => this.localeService.resolve(c, 'name') },
      { header: isEn ? 'Description' : 'Description', value: c => this.localeService.resolve(c, 'description') },
      { header: isEn ? 'Artworks' : 'Nb oeuvres', value: c => c.artworkCount ?? 0 }
    ];
    this.exportService.exportToExcel(this.categories(), columns, isEn ? 'categories' : 'categories');
  }

  private normalize(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
