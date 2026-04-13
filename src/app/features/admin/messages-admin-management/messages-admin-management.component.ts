import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AdminService } from '@features/admin/services/admin.service';
import { ContactMessage } from '@core/models/contact.model';
import { catchError, EMPTY } from 'rxjs';
import { MessageDetailDialogComponent } from './message-detail-dialog.component';
import { LoadingDirective } from '@/app/directives/loading.directive';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {MatTooltip} from '@angular/material/tooltip';
import {ConfirmDialogService} from '@shared/services/confirm-dialog.service';

@Component({
  selector: 'app-messages-admin-management',
  imports: [
    CommonModule, MatTableModule, MatButtonModule, MatIconModule,
    MatCardModule, MatChipsModule, MatDialogModule, LoadingDirective, TranslatePipe, MatTooltip
  ],
  templateUrl: './messages-admin-management.component.html',
  styleUrl: './messages-admin-management.component.scss'
})
export class MessagesAdminManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly dialog = inject(MatDialog);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly messages = signal<ContactMessage[]>([]);
  protected readonly unreadCount = signal(0);
  protected readonly displayedColumns = ['status', 'name', 'subject', 'createdAt', 'actions'];

  ngOnInit(): void {
    this.loadMessages();
  }

  private loadMessages(): void {
    this.adminService.getMessages()
      .pipe(catchError(() => EMPTY))
      .subscribe(messages => {
        this.messages.set(messages);
        this.unreadCount.set(messages.filter(m => !m.isRead).length);
      });
  }

  protected viewMessage(message: ContactMessage): void {
    this.dialog.open(MessageDetailDialogComponent, {
      data: message,
      width: '600px'
    }).afterClosed().subscribe(() => this.loadMessages());
  }

  protected deleteMessage(id: number): void {
    this.confirmDialog.confirm({
      title: 'Supprimer le message',
      message: 'Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler'
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
}
