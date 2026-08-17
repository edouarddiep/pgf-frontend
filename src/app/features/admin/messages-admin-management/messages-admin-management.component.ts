import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AdminService } from '@features/admin/services/admin.service';
import { ContactMessage } from '@core/models/contact.model';
import { catchError, EMPTY, finalize } from 'rxjs';
import { MessageDetailDialogComponent } from './message-detail-dialog.component';
import { LoadingDirective } from '@/app/directives/loading.directive';
import { SortableDirective } from '@/app/directives/sortable.directive';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { MatTooltip } from '@angular/material/tooltip';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';
import { TranslateService } from '@core/services/translate.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';

type SortField = 'createdAt' | 'name';

@Component({
  selector: 'app-messages-admin-management',
  imports: [
    CommonModule, MatTableModule, MatButtonModule, MatIconModule,
    MatCardModule, MatChipsModule, MatFormFieldModule, MatInputModule, MatDialogModule,
    LoadingDirective, SortableDirective, LoadingSpinnerComponent, TranslatePipe, MatTooltip
  ],
  templateUrl: './messages-admin-management.component.html',
  styleUrl: './messages-admin-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessagesAdminManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly dialog = inject(MatDialog);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translateService = inject(TranslateService);

  private readonly rawMessages = signal<ContactMessage[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly searchQuery = signal('');
  protected readonly sortField = signal<SortField>('createdAt');
  protected readonly sortAsc = signal(false);
  protected readonly displayedColumns = ['status', 'name', 'subject', 'createdAt', 'actions'];

  protected readonly unreadCount = computed(() => this.rawMessages().filter(m => !m.isRead).length);
  protected readonly totalCount = computed(() => this.rawMessages().length);

  protected readonly messages = computed(() => {
    const field = this.sortField();
    const asc = this.sortAsc();
    const tokens = this.normalize(this.searchQuery().trim()).split(/\s+/).filter(token => token.length > 0);

    let base = this.rawMessages();
    if (tokens.length > 0) {
      base = base.filter(message =>
        tokens.every(token =>
          this.normalize(message.name ?? '').includes(token) ||
          this.normalize(message.email ?? '').includes(token) ||
          this.normalize(message.subject ?? '').includes(token)
        )
      );
    }

    return [...base].sort((a, b) => {
      const va = field === 'name' ? this.normalize(a.name ?? '') : new Date(a.createdAt ?? 0).getTime();
      const vb = field === 'name' ? this.normalize(b.name ?? '') : new Date(b.createdAt ?? 0).getTime();
      return asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  });

  ngOnInit(): void {
    this.loadMessages();
  }

  private loadMessages(): void {
    this.isLoading.set(true);
    this.adminService.getMessages()
      .pipe(
        catchError(() => EMPTY),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(messages => this.rawMessages.set(messages));
  }

  protected viewMessage(message: ContactMessage): void {
    this.dialog.open(MessageDetailDialogComponent, {
      data: message,
      panelClass: 'message-detail-dialog-panel',
      width: '600px'
    }).afterClosed().subscribe(() => this.loadMessages());
  }

  protected deleteMessage(id: number): void {
    this.confirmDialog.confirm({
      title: this.translateService.translate('admin.messages.deleteConfirmTitle'),
      message: this.translateService.translate('admin.messages.deleteConfirmMessage'),
      confirmLabel: this.translateService.translate('admin.common.delete'),
      cancelLabel: this.translateService.translate('admin.common.cancel')
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.adminService.deleteMessage(id)
        .pipe(catchError(() => EMPTY))
        .subscribe(() => this.loadMessages());
    });
  }

  protected replyToMessage(message: ContactMessage): void {
    const subject = encodeURIComponent(`Re: ${message.subject}`);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(message.email)}&su=${subject}`;
    window.open(gmailUrl, '_blank');
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

  private normalize(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
