import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import {AdminService} from '@features/admin/services/admin.service';
import { ContactMessage } from '@core/models/contact.model';
import { catchError, EMPTY } from 'rxjs';
import { MessageDetailDialogComponent } from './message-detail-dialog.component';
import {LoadingDirective} from '@/app/directives/loading.directive';

@Component({
  selector: 'app-messages-admin-management',
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    LoadingDirective
  ],
  templateUrl: './messages-admin-management.component.html',
  styleUrl: './messages-admin-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessagesAdminManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly dialog = inject(MatDialog);

  protected readonly messages = signal<ContactMessage[]>([]);
  protected readonly displayedColumns = ['status', 'name', 'subject', 'createdAt', 'actions'];

  protected readonly unreadCount = signal(0);

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
    const dialogRef = this.dialog.open(MessageDetailDialogComponent, {
      data: message,
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'read') {
        this.loadMessages();
      }
    });
  }

  protected markAsRead(message: ContactMessage): void {
    this.adminService.markMessageAsRead(message.id)
      .pipe(catchError(() => EMPTY))
      .subscribe(() => {
        this.loadMessages();
      });
  }

  protected deleteMessage(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
      return;
    }

    this.adminService.deleteMessage(id)
      .pipe(catchError(() => EMPTY))
      .subscribe(() => {
        this.loadMessages();
      });
  }
}
