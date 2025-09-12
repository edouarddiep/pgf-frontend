import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ContactMessage } from '@core/models/contact.model';
import {AdminService} from '@features/admin/services/admin.service';

@Component({
  selector: 'app-message-detail-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule
  ],
  templateUrl: './message-detail-dialog.component.html',
  styleUrl: './message-detail-dialog.component.scss'
})
export class MessageDetailDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<MessageDetailDialogComponent>);
  private readonly adminService = inject(AdminService);
  protected readonly data = inject<ContactMessage>(MAT_DIALOG_DATA);

  protected markAsRead(): void {
    this.adminService.markMessageAsRead(this.data.id)
      .subscribe(() => {
        this.dialogRef.close('read');
      });
  }
}
