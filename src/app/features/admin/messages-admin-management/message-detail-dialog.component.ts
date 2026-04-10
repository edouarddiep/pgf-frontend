import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ContactMessage } from '@core/models/contact.model';
import { AdminService } from '@features/admin/services/admin.service';
import { catchError, EMPTY } from 'rxjs';
import {TranslatePipe} from '@core/pipes/translate.pipe';

@Component({
  selector: 'app-message-detail-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, TranslatePipe],
  templateUrl: './message-detail-dialog.component.html',
  styleUrl: './message-detail-dialog.component.scss'
})
export class MessageDetailDialogComponent {
  private readonly adminService = inject(AdminService);
  private readonly dialogRef = inject(MatDialogRef<MessageDetailDialogComponent>);
  protected readonly data = inject<ContactMessage>(MAT_DIALOG_DATA);

  protected close(): void {
    if (!this.data.isRead) {
      this.adminService.markMessageAsRead(this.data.id)
        .pipe(
          catchError(err => {
            console.error('markMessageAsRead error:', err);
            this.dialogRef.close(false);
            return EMPTY;
          })
        )
        .subscribe(() => this.dialogRef.close(true));
    } else {
      this.dialogRef.close(false);
    }
  }
}
