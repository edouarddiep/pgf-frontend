import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import {AdminService} from '@features/admin/services/admin.service';
import { ApiService } from '@core/services/api.service';
import { forkJoin, catchError, EMPTY } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    RouterLink
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly apiService = inject(ApiService);

  protected readonly stats = signal({
    categories: 0,
    artworks: 0,
    exhibitions: 0,
    messages: 0
  });

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    forkJoin({
      categories: this.adminService.getCategories(),
      artworks: this.adminService.getArtworks(),
      exhibitions: this.adminService.getExhibitions(),
      messages: this.adminService.getMessages()
    })
      .pipe(
        catchError(() => EMPTY)
      )
      .subscribe(data => {
        this.stats.set({
          categories: data.categories.length,
          artworks: data.artworks.length,
          exhibitions: data.exhibitions.length,
          messages: data.messages.length
        });
      });
  }
}
