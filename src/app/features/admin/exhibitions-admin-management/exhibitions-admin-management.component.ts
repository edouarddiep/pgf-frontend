import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { AdminService, AdminExhibitionRequest } from '@features/admin/services/admin.service';
import { Exhibition, ExhibitionStatus } from '@core/models/exhibition.model';
import { catchError, EMPTY } from 'rxjs';

interface ExhibitionFormData {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate?: string;
  imageUrl?: string;
  isFeatured: boolean;
  status: ExhibitionStatus;
}

@Component({
  selector: 'app-exhibitions-admin-management',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatCardModule,
    MatChipsModule
  ],
  templateUrl: './exhibitions-admin-management.component.html',
  styleUrl: './exhibitions-admin-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExhibitionsAdminManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  protected readonly exhibitions = signal<Exhibition[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingExhibition = signal<Exhibition | null>(null);
  protected readonly displayedColumns = ['image', 'title', 'dates', 'status', 'actions'];

  // Expose enum pour le template
  protected readonly ExhibitionStatus = ExhibitionStatus;

  protected readonly exhibitionForm = this.fb.group({
    title: ['', [Validators.required]],
    description: ['', [Validators.required]],
    location: ['', [Validators.required]],
    startDate: ['', [Validators.required]],
    endDate: [''],
    imageUrl: [''],
    isFeatured: [false],
    status: [ExhibitionStatus.UPCOMING, [Validators.required]]
  });

  ngOnInit(): void {
    this.loadExhibitions();
  }

  private loadExhibitions(): void {
    this.adminService.getExhibitions()
      .pipe(catchError(() => EMPTY))
      .subscribe(exhibitions => {
        this.exhibitions.set(exhibitions);
      });
  }

  protected getStatusColor(status: ExhibitionStatus): 'primary' | 'accent' | 'warn' {
    switch (status) {
      case ExhibitionStatus.UPCOMING: return 'primary';
      case ExhibitionStatus.ONGOING: return 'accent';
      case ExhibitionStatus.PAST: return 'warn';
      default: return 'primary';
    }
  }

  protected getStatusLabel(status: ExhibitionStatus): string {
    switch (status) {
      case ExhibitionStatus.UPCOMING: return 'À venir';
      case ExhibitionStatus.ONGOING: return 'En cours';
      case ExhibitionStatus.PAST: return 'Passée';
      default: return status;
    }
  }

  protected openForm(): void {
    this.showForm.set(true);
    this.editingExhibition.set(null);
    this.exhibitionForm.reset({
      title: '',
      description: '',
      location: '',
      startDate: '',
      endDate: '',
      imageUrl: '',
      isFeatured: false,
      status: ExhibitionStatus.UPCOMING
    });
  }

  protected editExhibition(exhibition: Exhibition): void {
    this.showForm.set(true);
    this.editingExhibition.set(exhibition);

    this.exhibitionForm.patchValue({
      title: exhibition.title,
      description: exhibition.description,
      location: exhibition.location,
      startDate: exhibition.startDate,
      endDate: exhibition.endDate || '',
      imageUrl: exhibition.imageUrl || '',
      isFeatured: exhibition.isFeatured,
      status: exhibition.status
    });
  }

  protected cancelForm(): void {
    this.showForm.set(false);
    this.editingExhibition.set(null);
    this.exhibitionForm.reset();
  }

  protected saveExhibition(): void {
    if (this.exhibitionForm.invalid) return;

    const formData = this.exhibitionForm.value as ExhibitionFormData;
    const request: AdminExhibitionRequest = {
      title: formData.title,
      description: formData.description,
      location: formData.location,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      imageUrl: formData.imageUrl || undefined,
      isFeatured: formData.isFeatured,
      status: formData.status
    };

    const editing = this.editingExhibition();
    const operation = editing
      ? this.adminService.updateExhibition(editing.id, request)
      : this.adminService.createExhibition(request);

    operation
      .pipe(catchError(() => EMPTY))
      .subscribe(() => {
        this.cancelForm();
        this.loadExhibitions();
      });
  }

  protected deleteExhibition(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette exposition ?')) {
      return;
    }

    this.adminService.deleteExhibition(id)
      .pipe(catchError(() => EMPTY))
      .subscribe(() => {
        this.loadExhibitions();
      });
  }
}
